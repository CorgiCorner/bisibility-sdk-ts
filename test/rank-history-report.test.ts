import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  BisibilityClient,
  BisibilityResponseError,
  type ProviderEvidenceProjection,
  type RankHistoryReportAttempt,
  type RankHistoryReportObservation,
} from "../src/index.js";

const fixture: Record<string, unknown> = JSON.parse(
  readFileSync(new URL("./fixtures/rank-history-report.json", import.meta.url), "utf8"),
);
const project = "prj_abcdefghijklmnopqrstuvwx";
const keyword = "kw_abcdefghijklmnopqrstuvwx";
const baseUrl = "https://api.example.com/api/v1";
const response = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });

function clientFor(packet: unknown, requests: URL[]) {
  return new BisibilityClient({
    apiKey: "bsb_key_test_transport_fixture",
    baseUrl,
    maxRetries: 0,
    fetch: async (input, init) => {
      expect(init?.method).toBe("GET");
      const url = new URL(String(input));
      if (url.pathname.endsWith("/capabilities"))
        return response({ apiVersions: ["v1"], data: [] });
      requests.push(url);
      return response(packet);
    },
  });
}

describe("actual server export transport contract", () => {
  it("types and validates nullable evidence on observations and logical attempts", async () => {
    expectTypeOf<RankHistoryReportObservation["evidence_projection"]>().toEqualTypeOf<
      ProviderEvidenceProjection | null | undefined
    >();
    expectTypeOf<RankHistoryReportAttempt["evidence_projection"]>().toEqualTypeOf<
      ProviderEvidenceProjection | null | undefined
    >();
    const projection: ProviderEvidenceProjection = {
      acceptance: null,
      fulfillment: null,
      returned_depth: null,
      accounting: null,
      result: null,
      cost: null,
      original_checked_at: null,
      recovery: null,
    };
    const source = fixture.full_attempts as { data: Record<string, unknown>[]; meta: unknown };
    const observations = fixture.observations as { data: Record<string, unknown>[] };
    const rows = [
      ...observations.data,
      ...source.data.filter((row) => row.kind === "logical_rank_check"),
    ];
    expect(rows.some((row) => row.kind === "logical_rank_check")).toBe(true);
    expect(rows.some((row) => "completeness" in row)).toBe(true);
    for (const extra of [{}, { evidence_projection: null }, { evidence_projection: projection }]) {
      const packet = { ...source, data: rows.map((row) => ({ ...row, ...extra })) };
      expect(
        await clientFor(packet, []).rankChecks.history.export(project, {
          version: "2",
          stream: "attempts",
        }),
      ).toEqual(packet);
    }
    for (const row of rows) {
      await expect(
        clientFor(
          { ...source, data: [{ ...row, evidence_projection: {} }] },
          [],
        ).rankChecks.history.export(project, { version: "2", stream: "attempts" }),
      ).rejects.toBeInstanceOf(BisibilityResponseError);
    }
  });

  it.each(["observations", "recorded", "attempts", "full_attempts"])(
    "retains every %s field, null, quality value and opaque cursor",
    async (stream) => {
      const requests: URL[] = [];
      const client = clientFor(fixture[stream], requests);
      const result = await client.rankChecks.history.export(project, {
        version: "2",
        stream: stream.includes("attempts") ? "attempts" : "observations",
        basis: stream === "observations" ? "observed_at" : "recorded_at",
        range: "all",
        from: "1970-01-01T00:00:00Z",
        to: "2026-10-12T12:00:00Z",
        aggregation: "none",
        ...(stream === "full_attempts" ? {} : { keywordIds: [keyword] }),
        limit: stream === "attempts" ? 1 : 200,
      });
      expect(result).toEqual(fixture[stream]);
      expect(result.meta.report.version).toBe(2);
      expect(result.meta.report.summary.metric.counts.unknown).toEqual(expect.any(Number));
      const url = requests[0];
      if (!url) throw new Error("Missing export request");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        version: "2",
        aggregation: "none",
        stream: stream.includes("attempts") ? "attempts" : "observations",
        basis: stream === "observations" ? "observed_at" : "recorded_at",
        from: "1970-01-01T00:00:00Z",
        to: "2026-10-12T12:00:00Z",
        ...(stream === "full_attempts" ? {} : { keyword_id: keyword }),
        limit: stream === "attempts" ? "1" : "200",
      });
    },
  );

  it("iterates all actual signed pages without changing export selection", async () => {
    const pages = fixture.attempt_pages;
    if (!Array.isArray(pages)) throw new Error("Missing actual server pages");
    let index = 0;
    const requests: URL[] = [];
    const client = new BisibilityClient({
      apiKey: "bsb_key_test_transport_fixture",
      baseUrl,
      fetch: async (input, init) => {
        expect(init?.method).toBe("GET");
        const url = new URL(String(input));
        if (url.pathname.endsWith("/capabilities")) return response({ data: [] });
        requests.push(url);
        return response(pages[index++]);
      },
    });
    const records = [];
    for await (const row of client.rankChecks.history.iterate(project, {
      version: "2",
      stream: "attempts",
      basis: "recorded_at",
      range: "all",
      aggregation: "none",
      from: "1970-01-01T00:00:00Z",
      to: "2026-10-12T12:00:00Z",
      keywordIds: [keyword],
      limit: 1,
    }))
      records.push(row);
    expect(records).toEqual(pages.flatMap((page) => page.data));
    expect(requests).toHaveLength(pages.length);
    for (const url of requests)
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        version: "2",
        stream: "attempts",
        range: "all",
        limit: "1",
      });
    expect(requests[0]?.searchParams.has("cursor")).toBe(false);
    expect(requests.slice(1).map((url) => url.searchParams.get("cursor"))).toEqual(
      pages.slice(0, -1).map((page) => page.meta.next_cursor),
    );
  });

  it("preserves legacy runtime and rejects cross-version or malformed success responses", async () => {
    const requests: URL[] = [];
    const legacy = await clientFor(fixture.legacy, requests).rankChecks.history.export(project, {
      range: "all",
    });
    expect(legacy).toEqual(fixture.legacy);
    expect(requests[0]?.searchParams.has("version")).toBe(false);
    await expect(
      clientFor(fixture.legacy, []).rankChecks.history.export(project, { version: "2" }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
    await expect(
      clientFor(
        { data: [], meta: { next_cursor: null, report: { version: 2 } } },
        [],
      ).rankChecks.history.export(project, { version: "2" }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
  it.each(["csv_observations", "csv_attempts"])(
    "returns the complete actual %s manifest without rewriting text or nested CID",
    async (name) => {
      const requests: URL[] = [];
      const client = new BisibilityClient({
        apiKey: "bsb_key_test_transport_fixture",
        baseUrl,
        maxRetries: 0,
        fetch: async (input) => {
          const url = new URL(String(input));
          if (url.pathname.endsWith("/capabilities")) return response({ data: [] });
          requests.push(url);
          return new Response(String(fixture[name]), { headers: { "Content-Type": "text/csv" } });
        },
      });
      expect(
        await client.rankChecks.history.export(project, {
          version: "2",
          format: "csv",
          stream: name === "csv_attempts" ? "attempts" : "observations",
          basis: name === "csv_observations" ? "observed_at" : "recorded_at",
          range: "all",
          from: "1970-01-01T00:00:00Z",
          to: "2026-10-12T12:00:00Z",
          aggregation: "none",
          ...(name === "csv_observations" ? { keywordIds: [keyword] } : {}),
        }),
      ).toBe(fixture[name]);
      expect(requests[0]?.searchParams.get("format")).toBe("csv");
      expect(requests[0]?.searchParams.has("cursor")).toBe(false);
    },
  );
  it("rejects a numeric CID and missing retained run authority instead of losing precision", async () => {
    const original = JSON.stringify(fixture.observations);
    expect(original).toContain('"cid":"18446744073709551615"');
    const numeric: unknown = JSON.parse(
      original.replace('"cid":"18446744073709551615"', '"cid":18446744073709551615'),
    );
    await expect(
      clientFor(numeric, []).rankChecks.history.export(project, { version: "2" }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
    const run = JSON.stringify(fixture.attempts);
    expect(run).toContain('"run_id":');
    const missing: unknown = JSON.parse(run.replace(/,"run_id":"rcr_[a-z0-9]+"/, ""));
    await expect(
      clientFor(missing, []).rankChecks.history.export(project, {
        version: "2",
        stream: "attempts",
      }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
});

it("preserves future output metadata values while keeping version and record discriminants strict", async () => {
  const next = JSON.parse(JSON.stringify(fixture.attempts));
  next.meta.report.window.basis = "future_time_basis";
  next.meta.report.summary_basis = "future_summary_basis";
  next.meta.report.normalized_items.completeness = "future_retention";
  next.meta.report.normalized_items.is_truncated = true;
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_transport_fixture",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: 0,
    fetch: async (input) =>
      new Response(
        JSON.stringify(
          String(input).endsWith("/capabilities") ? { data: [], apiVersions: ["v1"] } : next,
        ),
      ),
  });
  expect(
    await client.exportRankHistory("prj_abcdefghijklmnopqrstuvwx", {
      version: "2",
      format: "json",
      stream: "attempts",
      basis: "recorded_at",
    }),
  ).toEqual(next);
});
