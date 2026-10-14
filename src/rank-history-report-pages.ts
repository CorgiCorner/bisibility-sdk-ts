import { BisibilityError } from "./errors.js";
import type { ExportRankHistoryReportJsonOptions } from "./rank-history-export.js";
import type { RankHistoryReportResponse } from "./rank-history-report.js";

/** Collect a single frozen report. Reject changing metadata or a cursor cycle. */
export async function collectRankHistoryReport(
  fetchPage: (options: ExportRankHistoryReportJsonOptions) => Promise<RankHistoryReportResponse>,
  options: ExportRankHistoryReportJsonOptions,
): Promise<RankHistoryReportResponse> {
  const first = await fetchPage(options);
  const metadata = JSON.stringify(first.meta.report);
  const data = [...first.data];
  const seen = new Set(options.cursor ? [options.cursor] : []);
  let next = first.meta.next_cursor;
  while (next) {
    if (seen.has(next)) throw new BisibilityError("Rank history returned a repeated cursor.");
    seen.add(next);
    const page = await fetchPage({ ...options, cursor: next });
    if (JSON.stringify(page.meta.report) !== metadata)
      throw new BisibilityError("Rank history report metadata changed between pages.");
    data.push(...page.data);
    next = page.meta.next_cursor;
  }
  return { data, meta: { ...first.meta, next_cursor: null } };
}
