import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type BacklinksSnapshot,
  BisibilityApiError,
  BisibilityClient,
  type Keyword,
  type ObservationCompleteness,
  type RankCheck,
  isBacklinksSnapshot,
} from "../src/index.js";

const fixture = JSON.parse(readFileSync("test/fixtures/response-compatibility.json", "utf8")) as {
  full_backlinks: { status: number; body: { data: BacklinksSnapshot } };
  partial_backlinks: { status: number; body: { data: BacklinksSnapshot } };
  page_backlinks: { status: number; body: { data: BacklinksSnapshot } };
  failed_summary: { status: number; body: { details: Record<string, unknown> } };
  ranks: { check: RankCheck; keyword: Keyword }[];
  failed_keyword: Keyword;
  unobserved_keyword: Keyword;
};
const project = "prj_a00000000000000000000000";
function clientFor(body: unknown, status = 200) {
  return new BisibilityClient({
    apiKey: "bsb_key_test_fixture",
    baseUrl: "https://example.com/api/v1",
    fetch: async (input) => {
      const capabilities = String(input).endsWith("/capabilities");
      return new Response(JSON.stringify(capabilities ? { apiVersions: ["v1"], data: [] } : body), {
        status: capabilities ? 200 : status,
        headers: { "content-type": "application/json" },
      });
    },
  });
}

describe("application response compatibility", () => {
  it("retains partial backlinks as a successful typed snapshot", async () => {
    for (const source of [
      fixture.full_backlinks,
      fixture.partial_backlinks,
      fixture.page_backlinks,
    ]) {
      const response = await clientFor(source.body).analyzeBacklinks(project, {
        target: "example.com",
      });
      expect(isBacklinksSnapshot(response.data)).toBe(true);
      if (!isBacklinksSnapshot(response.data)) throw new Error("Expected snapshot");
      expectTypeOf(response.data.history_unavailable).toEqualTypeOf<boolean | undefined>();
      expect(response.data).toEqual(source.body.data);
      expect(response.data.summary.backlinks_total).toBe(12);
      expect(response.data.cost_cents).toBe(0.3);
    }
    expect(fixture.partial_backlinks.body.data.history).toEqual([]);
    expect(fixture.partial_backlinks.body.data.history_unavailable).toBe(true);
  });

  it("exposes typed coverage and both latest checks without creating absent ranks", async () => {
    for (const source of fixture.ranks) {
      const check = await clientFor(source.check).getRankCheckResult(source.check.id);
      const keyword = await clientFor(source.keyword).getKeyword(source.keyword.id);
      expectTypeOf(check.observation_completeness).toEqualTypeOf<
        ObservationCompleteness | null | undefined
      >();
      expect(check).toEqual(source.check);
      expect(keyword).toEqual(source.keyword);
      expect(keyword.latest_check?.observation_completeness).toBe(check.observation_completeness);
      expect(keyword.latest_successful_check?.position).toBe(check.position);
    }
    const failed = await clientFor(fixture.failed_keyword).getKeyword(fixture.failed_keyword.id);
    expect(failed.latest_check?.status).toBe("failed");
    expect(failed.latest_position).toBeNull();
    expect(failed.latest_successful_check?.position).toBe(6);
    const unobserved = await clientFor(fixture.unobserved_keyword).getKeyword(
      fixture.unobserved_keyword.id,
    );
    expect(unobserved.latest_check).toBeNull();
    expect(unobserved.latest_successful_check).toBeNull();
    expect(unobserved.latest_position).toBeNull();
    const first = fixture.ranks[0];
    if (!first) throw new Error("Missing rank fixture");
    const { observation_completeness: _coverage, ...legacy } = first.check;
    expect(
      (await clientFor(legacy).getRankCheckResult(legacy.id)).observation_completeness,
    ).toBeUndefined();
  });

  it("keeps a failed summary in an HTTP error with unknown total cost", async () => {
    const source = fixture.failed_summary;
    try {
      await clientFor(source.body, source.status).analyzeBacklinks(project, {
        target: "example.com",
      });
      throw new Error("Expected failed summary to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(BisibilityApiError);
      if (!(error instanceof BisibilityApiError)) throw error;
      expect(error.status).toBe(500);
      expect(error.problem).toMatchObject({ details: source.body.details });
      expect(source.body.details).toMatchObject({
        cost_cents: null,
        known_summary_cost_cents: 0.2,
      });
    }
  });
});
