import type { KeywordId, ListResponse, PaginationOptions, RankCheckId } from "./types.js";

export type RankHistoryExportRange = "30" | "90" | "all";

export type RankHistoryExportGranularity = "daily" | "weekly";

export interface RankHistoryExportRow {
  checked_at: string;
  id: RankCheckId;
  keyword: string;
  keyword_id: KeywordId;
  position: number | null;
  previous_position: number | null;
  provider?: string | null;
  requested_depth?: number | null;
  normalization_version?: string | null;
  ranking_url: string | null;
}

export type RankHistoryExportResponse = ListResponse<RankHistoryExportRow>;

interface RankHistoryExportOptions {
  granularity?: RankHistoryExportGranularity;
  keywordIds?: readonly KeywordId[];
  range?: RankHistoryExportRange;
  aggregation?: "none";
  basis?: "observed_at" | "recorded_at";
  from?: string;
  to?: string;
  stream?: "observations" | "attempts";
}

export interface ExportRankHistoryJsonOptions extends PaginationOptions, RankHistoryExportOptions {
  format?: "json";
  version?: "1";
}

export interface ExportRankHistoryCsvOptions extends RankHistoryExportOptions {
  format: "csv";
  version?: "1" | "2";
}

export interface ExportRankHistoryReportJsonOptions
  extends Omit<ExportRankHistoryJsonOptions, "version"> {
  version: "2";
}
export type { RankHistoryReportResponse, RankHistoryReportRecord } from "./rank-history-report.js";
