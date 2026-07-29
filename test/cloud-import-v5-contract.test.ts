import { describe, expect, it } from "vitest";
import type {
  CloudImportAlertRule,
  CloudImportAlertRuleTarget,
  CloudImportCompetitor,
  CloudImportKeyword,
  CloudImportNotificationPreference,
  CloudImportPackage,
  CloudImportSavedView,
  CloudImportSessionCreate,
  CloudImportSessionCreateResponse,
  CloudImportSessionSections,
} from "../src/index.js";
import { validatePublicIdRequest, validatePublicIdResponse } from "../src/public-id-contract.js";

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <
  Value,
>() => Value extends Right ? 1 : 2
  ? true
  : false;

type CloudImportKeywordKeys =
  | "device"
  | "id"
  | "keyword"
  | "location"
  | "rankingHistory"
  | "tags"
  | "target_url";
type CloudImportPackageKeys =
  | "alert_rules"
  | "competitors"
  | "exported_at"
  | "keywords"
  | "notification_preferences"
  | "project_id"
  | "saved_views"
  | "scope"
  | "version";
type CloudImportSessionSectionKeys =
  | "alert_rules"
  | "competitors"
  | "notification_preferences"
  | "saved_views"
  | "source_keyword_ids";
type CloudImportKeywordTargetKeys = "device" | "keyword" | "keyword_id" | "location" | "type";
type CloudImportTagTargetKeys = "tag" | "type";
type CloudImportNotificationPreferenceKeys =
  | "alert_email"
  | "alert_in_app"
  | "check_email"
  | "check_in_app"
  | "import_email"
  | "import_in_app"
  | "invite_email"
  | "invite_in_app"
  | "report_email";

const cloudImportKeywordKeysMatch: Equal<keyof CloudImportKeyword, CloudImportKeywordKeys> = true;
const cloudImportPackageKeysMatch: Equal<keyof CloudImportPackage, CloudImportPackageKeys> = true;
const cloudImportSessionSectionKeysMatch: Equal<
  keyof CloudImportSessionSections,
  CloudImportSessionSectionKeys
> = true;
const cloudImportKeywordTargetKeysMatch: Equal<
  keyof Extract<CloudImportAlertRuleTarget, { type: "keyword" }>,
  CloudImportKeywordTargetKeys
> = true;
const cloudImportTagTargetKeysMatch: Equal<
  keyof Extract<CloudImportAlertRuleTarget, { type: "tag" }>,
  CloudImportTagTargetKeys
> = true;
const cloudImportNotificationPreferenceKeysMatch: Equal<
  keyof CloudImportNotificationPreference,
  CloudImportNotificationPreferenceKeys
> = true;
const cloudImportPackageHasNoStringIndex: Equal<
  string extends keyof CloudImportPackage ? true : false,
  false
> = true;
const cloudImportSectionsHaveNoStringIndex: Equal<
  string extends keyof CloudImportSessionSections ? true : false,
  false
> = true;

const projectId = "prj_a00000000000000000000000";
const keywordId = "kw_a00000000000000000000000";
const competitorId = "cmp_a00000000000000000000000";
const ruleId = "alr_a00000000000000000000000";
const savedViewId = "viw_a00000000000000000000000";
const jobId = "imp_a00000000000000000000000";
const checksum = `sha256:${"a".repeat(64)}`;

const exactKeyword: CloudImportKeyword = {
  device: "desktop",
  id: keywordId,
  keyword: "rank tracker",
  location: "United States",
  rankingHistory: [
    {
      checkedAt: "2026-07-27T00:00:00.000Z",
      position: 3,
      previousPosition: 4,
      rankingUrl: "/rank-tracker",
    },
  ],
  tags: ["Product"],
  target_url: "/rank-tracker",
};

const exactAlertRule: CloudImportAlertRule = {
  change_pct: 2.5,
  channels: ["email", "slack", "webhook"],
  condition_type: "ctr_drop",
  competitor_domain: "rival.example.com",
  drop_positions: 3,
  enabled: true,
  id: ruleId,
  name: "CTR decline",
  serp_feature: "featured snippet",
  target_type: "keyword",
  targets: [
    {
      device: "desktop",
      keyword: "rank tracker",
      keyword_id: keywordId,
      location: "United States",
      type: "keyword",
    },
    { tag: "Product", type: "tag" },
  ],
  threshold_position: 3,
  top_n: 10,
};

const exactSavedView: CloudImportSavedView = {
  config: { filters: {} },
  id: savedViewId,
  name: "Primary report",
  surface: "keywords",
};

const exactPackage: CloudImportPackage = {
  alert_rules: [exactAlertRule],
  competitors: [{ domain: "rival.example.com", id: competitorId, label: "Rival" }],
  exported_at: "2026-07-27T00:00:00.000Z",
  keywords: [exactKeyword],
  notification_preferences: [
    {
      alert_email: true,
      alert_in_app: true,
      check_email: true,
      check_in_app: true,
      import_email: true,
      import_in_app: true,
      invite_email: true,
      invite_in_app: true,
      report_email: true,
    },
  ],
  project_id: projectId,
  saved_views: [exactSavedView],
  scope: "history",
  version: 5,
};

const exactSession: CloudImportSessionCreate = {
  chunk_count: 1,
  source_project_id: projectId,
  totals: { keywords: 1, rank_checks: 1 },
  version: 5,
};

const exactSections: CloudImportSessionSections = {
  alert_rules: [exactAlertRule],
  competitors: [{ domain: "rival.example.com", id: competitorId, label: "Rival" }],
  notification_preferences: [{ report_email: true }],
  saved_views: [exactSavedView],
  source_keyword_ids: {
    [keywordId]: { device: "desktop", location: "United States", text: "rank tracker" },
  },
};

const exactSessionResponse: CloudImportSessionCreateResponse = {
  chunk_limits: { max_body_bytes: 1, max_history_rows: 1, max_keywords: 1 },
  session_id: jobId,
  state: "receiving",
};

function acceptsKeyword(_value: CloudImportKeyword) {}
function acceptsCompetitor(_value: CloudImportCompetitor) {}
function acceptsSavedView(_value: CloudImportSavedView) {}
function acceptsAlertRule(_value: CloudImportAlertRule) {}
function acceptsTarget(_value: CloudImportAlertRuleTarget) {}
function acceptsPackage(_value: CloudImportPackage) {}
function acceptsSession(_value: CloudImportSessionCreate) {}
function acceptsSections(_value: CloudImportSessionSections) {}
function acceptsSessionResponse(_value: CloudImportSessionCreateResponse) {}

function compileTimeOnly() {
  // @ts-expect-error Cloud import keywords have no country alias.
  acceptsKeyword({ ...exactKeyword, country: "United States" });
  // @ts-expect-error Cloud import keywords have no text alias.
  acceptsKeyword({ ...exactKeyword, text: "rank tracker" });
  // @ts-expect-error Cloud import keywords have no targetUrl alias.
  acceptsKeyword({ ...exactKeyword, targetUrl: "/rank-tracker" });
  // @ts-expect-error Competitor identifiers are required.
  acceptsCompetitor({ domain: "rival.example.com" });
  // @ts-expect-error Saved-view identifiers are required.
  acceptsSavedView({ name: "Primary report" });
  // @ts-expect-error Alert-rule identifiers are required and camel aliases are unsupported.
  acceptsAlertRule({ changePct: 5, name: "CTR decline" });
  // @ts-expect-error Target identifiers use keyword_id only.
  acceptsTarget({ keywordId, type: "keyword" });
  // @ts-expect-error Tag targets have a tag label, not a tag_id alias.
  acceptsTarget({ tag_id: "tag_a00000000000000000000000", type: "tag" });
  // @ts-expect-error Tag targets have no tagId alias.
  acceptsTarget({ tag: "Brand", tagId: "tag_a00000000000000000000000", type: "tag" });
  // @ts-expect-error Top-level rank checks are not part of v5 exports.
  acceptsPackage({ ...exactPackage, rank_checks: [] });
  // @ts-expect-error v5 export envelopes use project_id, not projectId.
  acceptsPackage({ ...exactPackage, projectId });
  // @ts-expect-error Session creation requires source_project_id.
  acceptsSession({ chunk_count: 1, version: 5 });
  // @ts-expect-error Session sections accept only snake_case fields.
  acceptsSections({ sourceKeywordIds: {} });
  // @ts-expect-error Session results are job IDs, not ses IDs.
  acceptsSessionResponse({ ...exactSessionResponse, session_id: "sid_a00000000000000000000000" });
  // @ts-expect-error v4 is not an accepted migration schema version.
  acceptsPackage({ ...exactPackage, version: 4 });
}

void compileTimeOnly;

describe("cloud import v5 contract", () => {
  it("pins the exact exported v5 shapes without compatibility index signatures", () => {
    expect(cloudImportKeywordKeysMatch).toBe(true);
    expect(cloudImportPackageKeysMatch).toBe(true);
    expect(cloudImportSessionSectionKeysMatch).toBe(true);
    expect(cloudImportKeywordTargetKeysMatch).toBe(true);
    expect(cloudImportTagTargetKeysMatch).toBe(true);
    expect(cloudImportNotificationPreferenceKeysMatch).toBe(true);
    expect(cloudImportPackageHasNoStringIndex).toBe(true);
    expect(cloudImportSectionsHaveNoStringIndex).toBe(true);
  });

  it("accepts the canonical OpenAPI v5 package, session, chunks, and results", () => {
    expect(() => validatePublicIdRequest("/cloud/import", { body: exactPackage })).not.toThrow();
    expect(() =>
      validatePublicIdRequest("/cloud/import/sessions", { body: exactSession }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdRequest(`/cloud/import/sessions/${jobId}/chunks/0`, {
        body: { checksum, kind: "keywords", keywords: [exactKeyword] },
      }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdRequest(`/cloud/import/sessions/${jobId}/chunks/1`, {
        body: { checksum, kind: "sections", sections: exactSections },
      }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(
        "/cloud/import/compatibility",
        {
          app_version: "2026.07.27",
          latest_migration: null,
          schema_versions_supported: [5],
        },
        "GET",
      ),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(
        "/cloud/import",
        { counts: { keywords: 1 }, job_id: jobId, state: "done" },
        "POST",
      ),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse("/cloud/import/sessions", exactSessionResponse, "POST"),
    ).not.toThrow();
    expect(() =>
      validatePublicIdResponse(
        `/cloud/import/sessions/${jobId}/chunks/0`,
        { chunk_count: 1, chunks_received: 1, state: "receiving" },
        "PUT",
      ),
    ).not.toThrow();
  });

  it("rejects v4, raw IDs, legacy aliases, missing IDs, and non-canonical sections", () => {
    for (const body of [
      { ...exactPackage, version: 4 },
      { ...exactPackage, project_id: "cmmf4qedl0000ym5nmzq3yy7p" },
      { ...exactPackage, projectId },
      { ...exactPackage, rank_checks: [] },
      { ...exactPackage, keywords: [{ ...exactKeyword, country: "United States" }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, text: "rank tracker" }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, targetUrl: "/rank-tracker" }] },
      { ...exactPackage, competitors: [{ domain: "rival.example.com" }] },
      { ...exactPackage, saved_views: [{ name: "Primary report" }] },
      { ...exactPackage, alert_rules: [{ name: "CTR decline" }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, changePct: 5 }] },
      {
        ...exactPackage,
        alert_rules: [{ ...exactAlertRule, targets: [{ keywordId, type: "keyword" }] }],
      },
      {
        ...exactPackage,
        alert_rules: [
          {
            ...exactAlertRule,
            targets: [{ tag: "Brand", tagId: "tag_a00000000000000000000000", type: "tag" }],
          },
        ],
      },
      { ...exactPackage, notification_preferences: [{ alertEmail: true }] },
    ]) {
      expect(() => validatePublicIdRequest("/cloud/import", { body })).toThrow();
    }

    expect(() =>
      validatePublicIdRequest("/cloud/import/sessions", {
        body: { chunk_count: 1, version: 5 },
      }),
    ).toThrow();
    expect(() =>
      validatePublicIdRequest("/cloud/import/sessions", {
        body: { chunk_count: 1, source_project_id: "cmmf4qedl0000ym5nmzq3yy7p", version: 5 },
      }),
    ).toThrow();
    expect(() =>
      validatePublicIdRequest(`/cloud/import/sessions/${jobId}/chunks/0`, {
        body: { checksum, kind: "sections", sections: { sourceKeywordIds: {} } },
      }),
    ).toThrow();
    expect(() =>
      validatePublicIdRequest("/cloud/import/sessions/sid_a00000000000000000000000/chunks/0", {
        body: { checksum, kind: "keywords", keywords: [exactKeyword] },
      }),
    ).toThrow();
    expect(() =>
      validatePublicIdResponse(
        "/cloud/import/sessions",
        { ...exactSessionResponse, session_id: "sid_a00000000000000000000000" },
        "POST",
      ),
    ).toThrow();
  });

  it("enforces the OpenAPI field constraints across packages, sessions, chunks, and responses", () => {
    for (const body of [
      null,
      { ...exactPackage, exported_at: "not-a-date" },
      { ...exactPackage, keywords: "not-an-array" },
      { ...exactPackage, keywords: new Array(501).fill(exactKeyword) },
      { ...exactPackage, keywords: [{ ...exactKeyword, keyword: 1 }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, keyword: "" }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, keyword: "a".repeat(181) }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, device: "tablet" }] },
      {
        ...exactPackage,
        keywords: [
          {
            ...exactKeyword,
            rankingHistory: [{ checkedAt: "not-a-date" }],
          },
        ],
      },
      {
        ...exactPackage,
        keywords: [
          {
            ...exactKeyword,
            rankingHistory: [{ checkedAt: "2026-07-27T00:00:00.000Z", position: 0 }],
          },
        ],
      },
      { ...exactPackage, keywords: [{ ...exactKeyword, tags: new Array(13).fill("tag") }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, tags: [""] }] },
      { ...exactPackage, keywords: [{ ...exactKeyword, target_url: 1 }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, change_pct: "bad" }] },
      {
        ...exactPackage,
        alert_rules: [{ ...exactAlertRule, change_pct: Number.POSITIVE_INFINITY }],
      },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, channels: ["sms"] }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, enabled: "yes" }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, threshold_position: 0 }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, targets: [null] }] },
      { ...exactPackage, alert_rules: [{ ...exactAlertRule, targets: [{ type: "other" }] }] },
      { ...exactPackage, saved_views: [{ ...exactSavedView, surface: "overview" }] },
      { ...exactPackage, notification_preferences: [{ report_email: "yes" }] },
    ]) {
      expect(() => validatePublicIdRequest("/cloud/import", { body })).toThrow();
    }

    for (const body of [
      null,
      { ...exactSession, chunk_count: 0 },
      { ...exactSession, chunk_count: 1.5 },
      { ...exactSession, chunk_count: 501 },
      { ...exactSession, totals: { unknown: 1 } },
      { ...exactSession, totals: { keywords: -1 } },
      { ...exactSession, version: 4 },
    ]) {
      expect(() => validatePublicIdRequest("/cloud/import/sessions", { body })).toThrow();
    }

    for (const body of [
      null,
      { checksum: "sha256:bad", kind: "keywords", keywords: [exactKeyword] },
      { checksum: "sha256:bad", kind: "sections", sections: exactSections },
      { checksum, kind: "other" },
      { checksum, kind: "sections", sections: { source_keyword_ids: "not-an-object" } },
    ]) {
      expect(() =>
        validatePublicIdRequest(`/cloud/import/sessions/${jobId}/chunks/0`, { body }),
      ).toThrow();
    }

    for (const [path, response, method] of [
      ["/cloud/import/compatibility", null, "GET"],
      [
        "/cloud/import/compatibility",
        { app_version: "2026.07.27", latest_migration: null, schema_versions_supported: [3] },
        "GET",
      ],
      ["/cloud/import", null, "POST"],
      ["/cloud/import", { counts: null, job_id: jobId, state: "done" }, "POST"],
      ["/cloud/import", { counts: {}, job_id: jobId, state: "pending" }, "POST"],
      ["/cloud/import/sessions", null, "POST"],
      ["/cloud/import/sessions", { ...exactSessionResponse, chunk_limits: null }, "POST"],
      ["/cloud/import/sessions", { ...exactSessionResponse, state: "done" }, "POST"],
      [`/cloud/import/sessions/${jobId}/chunks/0`, null, "PUT"],
      [
        `/cloud/import/sessions/${jobId}/chunks/0`,
        { chunk_count: 1, chunks_received: 1, state: "done" },
        "PUT",
      ],
    ] as const) {
      expect(() => validatePublicIdResponse(path, response, method)).toThrow();
    }
  });
});
