import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  BisibilityClient,
  BisibilityConfigurationError,
  PUBLIC_ID_PREFIXES,
  PUBLIC_ID_RESOURCE_REGISTRY,
  type PublicIdPrefix,
  assertPublicIdOfType,
  isPublicId,
  isPublicIdOfType,
  publicIdExpectation,
} from "../src/index.js";
import { validatePublicIdRequest, validatePublicIdResponse } from "../src/public-id-contract.js";

const suffix = "a00000000000000000000000";

function id(prefix: PublicIdPrefix) {
  return `${prefix}_${suffix}`;
}

const ids = Object.fromEntries(PUBLIC_ID_PREFIXES.map((prefix) => [prefix, id(prefix)])) as Record<
  PublicIdPrefix,
  string
>;

describe("public ID v3 registry", () => {
  it("defines the complete canonical resource registry", () => {
    expect(PUBLIC_ID_PREFIXES).toEqual([
      "al",
      "alr",
      "audit",
      "check",
      "cmp",
      "conn",
      "dwh",
      "ferry",
      "imp",
      "inv",
      "key",
      "kw",
      "mbr",
      "ntf",
      "pat",
      "prj",
      "sid",
      "sig",
      "svkw",
      "tag",
      "usr",
      "viw",
      "we",
    ]);
    expect(Object.keys(PUBLIC_ID_RESOURCE_REGISTRY)).toEqual(PUBLIC_ID_PREFIXES);
  });

  it("accepts every registered prefix only with a lowercase CUID2-length suffix", () => {
    for (const prefix of PUBLIC_ID_PREFIXES) {
      expect(isPublicId(ids[prefix])).toBe(true);
      expect(isPublicIdOfType(ids[prefix], prefix)).toBe(true);
      expect(assertPublicIdOfType(ids[prefix], prefix)).toBeUndefined();
    }

    for (const invalid of [
      "prj_abc123",
      "prj_A00000000000000000000000",
      "prj_000000000000000000000000",
      "project_a00000000000000000000000",
      "cmmf4qedl0000ym5nmzq3yy7p",
      "kw_a00000000000000000000000",
    ]) {
      expect(isPublicIdOfType(invalid, "prj")).toBe(false);
    }
    expect(() => assertPublicIdOfType("prj_abc123", "prj")).toThrow(publicIdExpectation("prj"));
  });

  it.each([
    "alert",
    "rule",
    "comp",
    "hook",
    "invite",
    "job",
    "member",
    "mtok",
    "notif",
    "ses",
    "skw",
    "view",
    "webhook",
  ])("rejects the retired %s prefix", (prefix) => {
    expect(isPublicId(`${prefix}_${suffix}`)).toBe(false);
  });
});

describe("public ID request contract", () => {
  it("accepts every typed path selector and rejects raw or mismatched values", () => {
    const validPaths: Array<[string, string]> = [
      ["project", `/projects/${ids.prj}`],
      ["keyword", `/keywords/${ids.kw}`],
      ["rank check", `/rank-checks/${ids.check}`],
      ["api key", `/api-keys/${ids.key}`],
      ["personal token", `/me/tokens/${ids.pat}`],
      ["webhook", `/projects/${ids.prj}/webhooks/${ids.we}`],
      ["project-derived sitemap monitor", `/projects/${ids.prj}/sitemap-monitors/${ids.prj}`],
      ["rule", `/alert-rules/${ids.alr}`],
      ["alert", `/projects/${ids.prj}/triggered-alerts/${ids.al}/mute`],
      ["invite", `/projects/${ids.prj}/team/invites/${ids.inv}`],
      ["member", `/projects/${ids.prj}/team/members/${ids.mbr}`],
      ["view", `/saved-views/${ids.viw}`],
      ["competitor", `/competitors/${ids.cmp}`],
      ["migration token", `/migration-tokens/${ids.ferry}`],
      ["import job", `/cloud/import/sessions/${ids.imp}/finalize`],
    ];

    for (const [, path] of validPaths) expect(() => validatePublicIdRequest(path)).not.toThrow();

    expect(() => validatePublicIdRequest("/projects/cmmf4qedl0000ym5nmzq3yy7p")).toThrow(
      publicIdExpectation("prj"),
    );
    expect(() => validatePublicIdRequest(`/keywords/${ids.prj}`)).toThrow(
      publicIdExpectation("kw"),
    );
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/sitemap-monitors/${ids.kw}`),
    ).toThrow(publicIdExpectation("prj"));
    expect(() => validatePublicIdRequest("/me/tokens/current")).not.toThrow();
  });

  it("rejects invalid ID-bearing body and query fields", () => {
    expect(() =>
      validatePublicIdRequest("/keywords/bulk", {
        body: { keyword_ids: ["kw_abc123"], operation: "delete" },
      }),
    ).toThrow(publicIdExpectation("kw"));
    expect(() =>
      validatePublicIdRequest("/signals", { body: { keyword_id: "kw_abc123" } }),
    ).toThrow(publicIdExpectation("kw"));
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/alert-rules`, {
        body: { target_ids: [ids.tag], target_type: "keyword" },
      }),
    ).toThrow(publicIdExpectation("kw"));
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/alert-rules`, {
        body: { recipient_ids: [ids.prj] },
      }),
    ).toThrow(publicIdExpectation("usr"));
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/alert-rules`, {
        body: { target_ids: [], target_type: "all" },
      }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/alert-rules`, {
        body: { target_ids: [ids.kw], target_type: "all" },
      }),
    ).toThrow("must be empty");
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/exports/rank-history`, {
        query: { keyword_id: [ids.kw, "kw_abc123"] },
      }),
    ).toThrow(publicIdExpectation("kw"));
    expect(() =>
      validatePublicIdRequest(`/projects/${ids.prj}/analytics/query-stats`, {
        query: { connection_id: "conn_abc123" },
      }),
    ).toThrow(publicIdExpectation("conn"));
    expect(() => validatePublicIdRequest("/cloud/import", { body: { version: 4 } })).toThrow(
      "Cloud import payload version must be 5.",
    );
    expect(() =>
      validatePublicIdRequest(`/cloud/import/sessions/${ids.imp}/chunks/0`, {
        body: {
          checksum: `sha256:${"a".repeat(64)}`,
          kind: "sections",
          sections: { source_keyword_ids: { cmmf4qedl0000ym5nmzq3yy7p: {} } },
        },
      }),
    ).toThrow(publicIdExpectation("kw"));
  });

  it("rejects malformed values before fetch, including a caller-supplied project header", async () => {
    const fetchMock = vi.fn();
    const client = new BisibilityClient({
      apiKey: "bsb_key_test_x",
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(client.getProject("prj_abc123" as never)).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    await expect(
      client.createSignal({ keyword_id: "kw_abc123" as never, source: "api", type: "deploy.ok" }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    await expect(
      client.getKeyword(ids.kw as never, { headers: { "X-Bisibility-Project": "prj_abc123" } }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("public ID response schema", () => {
  it("types every public API resource field with its resource-specific ID alias", () => {
    const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");
    for (const declaration of [
      "id: ProjectId;",
      "project_id: ProjectId;",
      "id: KeywordId;",
      "keyword_id: KeywordId;",
      "id: RankCheckId;",
      "id: AlertRuleId;",
      "recipient_ids: UserId[];",
      'target_ids: KeywordId[]; target_type: "keyword"',
      'target_ids: TagId[]; target_type: "tag"',
      "id: AlertId;",
      "id: ApiKeyId;",
      "id: PersonalAccessTokenId;",
      "id: WebhookId;",
      "id: InviteId;",
      "id: MembershipId;",
      "id: ConnectionId;",
      "connectionId?: ConnectionId;",
      "id: SavedViewId;",
      "id: CompetitorId;",
      "id: MigrationTokenId;",
      "id: CloudImportJobId | null;",
      "id: SignalId;",
      "public_id: SignalId;",
      "id: UserId;",
      "ranks: CompetitorRankMap;",
      "source_keyword_ids?: Partial<Record<KeywordId, CloudImportSourceKeyword>>;",
    ]) {
      expect(types).toContain(declaration);
    }
    expect(types).not.toContain(
      "export interface LocationSuggestion {\n  city_name: string | null;\n  id:",
    );
    expect(types).not.toContain(
      "export interface PageTrafficSnapshot {\n  bounce_rate: number | null;\n  id:",
    );
    expect(types).not.toContain(
      "export interface PageTrafficSnapshot {\n  bounce_rate: number | null;\n  project_id:",
    );
    expect(types).not.toContain(
      "export interface SitemapMonitorSnapshot {\n  fetched_at: string;\n  id:",
    );
    expect(types).not.toMatch(
      /^\s*(?:id|project_id|keyword_id|rule_id|tag_id|created_by_id|connection_id|public_id): string(?: \| null)?;/m,
    );
  });

  it("validates alert recipients and target arrays by target type", () => {
    const keywordRule = {
      id: ids.alr,
      recipient_ids: [ids.usr],
      target_ids: [ids.kw],
      target_type: "keyword",
    };
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, { data: [keywordRule] }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(`/alert-rules/${ids.alr}`, {
        id: ids.alr,
        recipient_ids: [ids.usr],
        target_ids: [ids.tag],
        target_type: "tag",
      }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(`/alert-rules/${ids.alr}`, {
        id: ids.alr,
        recipient_ids: [],
        target_ids: [],
        target_type: "all",
      }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, recipient_ids: [ids.prj] }],
      }),
    ).toThrow(publicIdExpectation("usr"));
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, target_ids: [ids.tag] }],
      }),
    ).toThrow(publicIdExpectation("kw"));
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, created_by_id: ids.usr }],
      }),
    ).toThrow("not part of the public alert rule response");
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, project_id: ids.prj }],
      }),
    ).toThrow("not part of the public alert rule response");
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, targets: [] }],
      }),
    ).toThrow("not part of the public alert rule response");
    expect(() =>
      validatePublicIdResponse(`/projects/${ids.prj}/alert-rules`, {
        data: [{ ...keywordRule, target_ids: [ids.kw], target_type: "all" }],
      }),
    ).toThrow("must be empty");
    expect(() =>
      validatePublicIdResponse(`/alert-rules/${ids.alr}`, { deleted: true }, "DELETE"),
    ).not.toThrow();
    expect(() => validatePublicIdResponse("/projects", { id: "raw" })).not.toThrow();
  });

  it("wraps malformed alert-rule response IDs in a response error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: ids.alr,
          recipient_ids: [ids.prj],
          target_ids: [],
          target_type: "all",
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new BisibilityClient({
      apiKey: "bsb_key_test_x",
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(
      client.updateAlertRule(ids.alr as never, {
        condition_type: "threshold",
        name: "Ranking drop",
        target_type: "all",
      }),
    ).rejects.toMatchObject({ name: "BisibilityResponseError" });
  });
});
