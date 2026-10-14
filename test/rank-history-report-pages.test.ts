import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { iterateCursorPagination } from "../src/pagination.js";
import { collectRankHistoryReport } from "../src/rank-history-report-pages.js";
import type { RankHistoryReportResponse } from "../src/rank-history-report.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/rank-history-report.json", import.meta.url), "utf8"),
);
const pages: RankHistoryReportResponse[] = fixture.attempt_pages;
describe("frozen report pages", () => {
  it("collects all eleven native fixture pages and preserves unchanged metadata", async () => {
    let index = 0;
    const fetch = vi.fn(async () => pages[index++] as RankHistoryReportResponse);
    const result = await collectRankHistoryReport(fetch, { version: "2", stream: "attempts" });
    expect(result.data).toEqual(pages.flatMap((page) => page.data));
    expect(result.meta.report).toEqual(pages[0]?.meta.report);
    expect(result.meta.next_cursor).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(11);
  });
  it("rejects changed metadata before aggregating the second page", async () => {
    const altered = structuredClone(pages[1]) as RankHistoryReportResponse;
    altered.meta.report.metric_id = "different_metric";
    const fetch = vi.fn().mockResolvedValueOnce(pages[0]).mockResolvedValueOnce(altered);
    await expect(collectRankHistoryReport(fetch, { version: "2" })).rejects.toThrow(
      "metadata changed",
    );
  });
  it("rejects an echoed initial cursor before a second request", async () => {
    const first = structuredClone(pages[0]) as RankHistoryReportResponse;
    first.meta.next_cursor = "opaque";
    const fetch = vi.fn().mockResolvedValue(first);
    await expect(
      collectRankHistoryReport(fetch, { version: "2", cursor: "opaque" }),
    ).rejects.toThrow("repeated cursor");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("stops generic run pagination when a server repeats a cursor", async () => {
    const fetch = vi.fn().mockResolvedValue({ data: [1], meta: { next_cursor: "opaque" } });
    const results: number[] = [];
    await expect(
      (async () => {
        for await (const item of iterateCursorPagination(fetch, { cursor: "opaque" }))
          results.push(item as number);
      })(),
    ).rejects.toThrow("repeated pagination cursor");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
