import { describe, expect, it } from "vitest";
import { validatePublicIdRequest, validatePublicIdResponse } from "../src/public-id-contract.js";

const projectId = "prj_a00000000000000000000000";
const keywordId = "kw_a00000000000000000000000";
const history = {
  checkedAt: "2026-10-07T00:00:00.000Z",
  normalizationVersion: "v2",
  position: null,
  previousPosition: 3,
  provider: "dataforseo",
  rankingUrl: null,
  requestedDepth: 100,
};
const keyword = {
  device: "desktop",
  id: keywordId,
  keyword: "rank tracker",
  location: "United States",
  rankingHistory: [history],
};
function payload(version: number, keywords: unknown[]) {
  return {
    alert_rules: [],
    competitors: [],
    keywords,
    notification_preferences: [],
    project_id: projectId,
    saved_views: [],
    version,
  };
}

describe("current cloud import contract", () => {
  it("accepts the current and future server-advertised positive integer versions", () => {
    expect(() =>
      validatePublicIdResponse(
        "/cloud/import/compatibility",
        {
          app_version: "0.28.0",
          latest_migration: null,
          schema_versions_supported: [7, 6, 8],
        },
        "GET",
      ),
    ).not.toThrow();
  });

  it.each([6, 7])("accepts version %s packages and session manifests", (version) => {
    const item =
      version === 7 ? { ...keyword, location: "Austin", location_key: "US/US-TX/Austin" } : keyword;
    expect(() =>
      validatePublicIdRequest("/cloud/import", { body: payload(version, [item]) }),
    ).not.toThrow();
    expect(() =>
      validatePublicIdRequest("/cloud/import/sessions", {
        body: { chunk_count: 1, source_project_id: projectId, version },
      }),
    ).not.toThrow();
  });

  it("rejects ambiguous legacy history, absent v7 keys, and v6 canonical-key relabeling", () => {
    for (const body of [
      payload(5, [
        { ...keyword, rankingHistory: [{ checkedAt: history.checkedAt, position: null }] },
      ]),
      payload(7, [keyword]),
      payload(6, [{ ...keyword, location_key: "US" }]),
    ])
      expect(() => validatePublicIdRequest("/cloud/import", { body })).toThrow();
  });

  it.each([0, -1, 6.5, "7", null])("rejects invalid advertised version %j", (version) => {
    expect(() =>
      validatePublicIdResponse(
        "/cloud/import/compatibility",
        {
          app_version: "0.28.0",
          latest_migration: null,
          schema_versions_supported: [version],
        },
        "GET",
      ),
    ).toThrow();
  });
});
