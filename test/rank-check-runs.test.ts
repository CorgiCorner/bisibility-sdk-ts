import { describe, expect, it } from "vitest";
import {
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityResponseError,
} from "../src/index.js";

const project = "prj_abcdefghijklmnopqrstuvwx";
const runId = "rcr_abcdefghijklmnopqrstuvwx";
const run = {
  id: runId,
  project_id: project,
  status: "cancelled",
  outcome: null,
  terminal: true,
  polling_state: "terminal",
  trigger: "manual",
  counts: {
    requested: 1,
    total: 1,
    completed: 0,
    failed: 0,
    deferred: 0,
    skipped: 0,
    cancelled: 1,
  },
  counts_basis: "planned_or_unlaunched",
  keyword_count: 1,
  target_count: 1,
  planned_for: null,
  launched_at: null,
  started_at: null,
  finished_at: "2026-10-12T10:00:00.000Z",
  blocked_reason: null,
  parent_run_id: null,
  cost_cents: null,
  usage: { actual: null, estimated: null, unit: "operations" },
  native_estimate: { provider_id: null, unit: null, quantity: null, unknown_targets: 1 },
};

function setup(value: unknown) {
  const requests: URL[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_run_fixture",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: 0,
    fetch: async (input, init) => {
      expect(init?.method).toBe("GET");
      const url = new URL(String(input));
      if (url.pathname.endsWith("/capabilities"))
        return new Response(JSON.stringify({ data: [], apiVersions: ["v1"] }));
      requests.push(url);
      return new Response(JSON.stringify(value));
    },
  });
  return { client, requests };
}

describe("retained rank-check run reads", () => {
  it("lists runs and forwards the server filters through actual HTTP", async () => {
    const response = { data: [run], meta: { next_cursor: "next-page" } };
    const { client, requests } = setup(response);
    expect(
      await client.rankChecks.runs.list(project, {
        segment: "planned",
        status: "blocked,cancelled",
        cursor: "cursor+/=",
        limit: 25,
      }),
    ).toEqual(response);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.pathname).toBe(`/api/v1/projects/${project}/rank-check-runs`);
    expect(Object.fromEntries(requests[0]?.searchParams ?? [])).toEqual({
      segment: "planned",
      status: "blocked,cancelled",
      cursor: "cursor+/=",
      limit: "25",
    });
  });

  it.each([
    ["cancelled", true, "terminal"],
    ["blocked", false, "blocked"],
    ["future_status", false, "future_polling_state"],
  ])("reads %s without requiring a rank-check row", async (status, terminal, polling_state) => {
    const response = { ...run, status, terminal, polling_state, outcome: "future_outcome" };
    const { client, requests } = setup(response);
    expect(await client.rankChecks.runs.get(project, runId)).toEqual(response);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.pathname).toBe(`/api/v1/projects/${project}/rank-check-runs/${runId}`);
  });

  it("rejects invalid request identifiers before any network request", async () => {
    const { client, requests } = setup(run);
    await expect(async () => client.getRankCheckRun(project, "rcr_invalid")).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    await expect(async () => client.listRankCheckRuns("prj_invalid")).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    expect(requests).toHaveLength(0);
  });

  it("rejects malformed and foreign responses before returning run data", async () => {
    const { counts: _counts, ...missing } = run;
    for (const response of [
      {},
      missing,
      { ...run, cost_cents: "0" },
      { ...run, usage: { actual: 0 } },
      { ...run, id: "rcr_invalid" },
      { ...run, id: "rcr_bbcdefghijklmnopqrstuvwx" },
      { ...run, project_id: "prj_bbcdefghijklmnopqrstuvwx" },
      { ...run, parent_run_id: "kw_abcdefghijklmnopqrstuvwx" },
    ])
      await expect(setup(response).client.getRankCheckRun(project, runId)).rejects.toBeInstanceOf(
        BisibilityResponseError,
      );
    await expect(
      setup({ data: [missing], meta: { next_cursor: null } }).client.listRankCheckRuns(project),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
});
