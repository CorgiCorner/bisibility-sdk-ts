import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityResponseError,
} from "../src/index.js";
const fixture: Record<string, unknown> = JSON.parse(
  readFileSync(new URL("./fixtures/local-monitor-transport.json", import.meta.url), "utf8"),
);
const project = "prj_abcdefghijklmnopqrstuvwx";
const monitor = "lmn_abcdefghijklmnopqrstuvwx";
const run = "lmr_abcdefghijklmnopqrstuvwx";
const point = "lmt_aaaaaaaaaaaaaaaaaaaaaaa0";
function setup(value: unknown, text = false) {
  const requests: URL[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_transport_fixture",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: 0,
    fetch: async (input, init) => {
      expect(init?.method).toBe("GET");
      const url = new URL(String(input));
      if (url.pathname.endsWith("/capabilities"))
        return new Response(JSON.stringify({ data: [], apiVersions: ["v1"] }));
      requests.push(url);
      return new Response(text ? String(value) : JSON.stringify(value));
    },
  });
  return { client, requests };
}
describe("actual server Local retained read contracts", () => {
  it("preserves five response bodies plus CSV and frozen query fields through real SDK HTTP", async () => {
    const cases = [
      [
        "history",
        (c: BisibilityClient) =>
          c.localMonitors.history(project, monitor, {
            asOf: "2026-10-12T12:00:00.000Z",
            from: "2026-10-12T00:00:00.000Z",
            to: "2026-10-12T12:00:00.000Z",
            cursor: "c".repeat(8000),
          }),
      ],
      ["result", (c: BisibilityClient) => c.localMonitors.results(project, monitor, run)],
      ["listings", (c: BisibilityClient) => c.localMonitors.listings(project, monitor, run, point)],
      [
        "point_history",
        (c: BisibilityClient) => c.localMonitors.pointHistory(project, monitor, run, point),
      ],
      ["export_json", (c: BisibilityClient) => c.localMonitors.export(project, monitor, run)],
    ] as const;
    for (const [name, read] of cases) {
      const { client, requests } = setup(fixture[name]);
      expect(await read(client)).toEqual(fixture[name]);
      expect(requests).toHaveLength(1);
      if (name === "history") expect(requests[0]?.searchParams.get("cursor")).toHaveLength(8000);
    }
    const { client } = setup(fixture.export_csv, true);
    expect(await client.exportLocalMonitorRun(project, monitor, run, { format: "csv" })).toEqual(
      fixture.export_csv,
    );
  });
  it.each(["result_unknown", "result_stale"])(
    "retains %s without inventing rank or freshness",
    async (name) => {
      const { client } = setup(fixture[name]);
      expect(await client.getLocalMonitorRunResults(project, monitor, run)).toEqual(fixture[name]);
    },
  );
  it("accepts future output metadata enum values and preserves large string CID", async () => {
    const next = JSON.parse(JSON.stringify(fixture.result));
    next.data.points[0].freshness = "future_freshness";
    next.data.freshness_policy.basis = "future_policy";
    const { client } = setup(next);
    expect(await client.getLocalMonitorRunResults(project, monitor, run)).toEqual(next);
    const { client: listings } = setup(fixture.listings);
    expect(
      (await listings.listLocalMonitorPointListings(project, monitor, run, point)).data[0]?.cid,
    ).toBe("9007199254740993123");
  });
  it("refuses empty/oversized cursor and invalid dates/IDs before any fetch", async () => {
    const { client, requests } = setup(fixture.history);
    for (const options of [
      { cursor: "" },
      { cursor: "x".repeat(8001) },
      { asOf: "2026-10-12T12:00:00Z" },
      { asOf: "2099-01-01T00:00:00.000Z" },
      { from: "2026-10-13T00:00:00.000Z", to: "2026-10-12T00:00:00.000Z" },
    ])
      await expect(async () =>
        client.listLocalMonitorRuns(project, monitor, options),
      ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    await expect(async () =>
      client.getLocalMonitorRunResults(project, monitor, "lmr_invalid"),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    await expect(async () =>
      client.getLocalMonitorRunResults("prj_abcdefghijklmnopqrstuvwx?escape", monitor, run),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(requests).toHaveLength(0);
  });
  it("retains new Finder group rank scale through the public listing DTO", async () => {
    const next = structuredClone(fixture.listings) as { data: Array<{ rank_scale: string }> };
    const first = next.data[0];
    if (!first) throw new Error("Local listing fixture missing");
    first.rank_scale = "finder_group";
    expect(await setup(next).client.localMonitors.listings(project, monitor, run, point)).toEqual(
      next,
    );
  });
  it("rejects numeric CID, missing required data and foreign project before returning a DTO", async () => {
    const unsafe = JSON.parse(JSON.stringify(fixture.listings));
    unsafe.data[0].cid = 9007199254740993000;
    await expect(
      setup(unsafe).client.listLocalMonitorPointListings(project, monitor, run, point),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
    await expect(
      setup({ data: {} }).client.getLocalMonitorRunResults(project, monitor, run),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
    const foreign = JSON.parse(JSON.stringify(fixture.result));
    foreign.data.project_id = "prj_bbcdefghijklmnopqrstuvwx";
    await expect(
      setup(foreign).client.getLocalMonitorRunResults(project, monitor, run),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
});
