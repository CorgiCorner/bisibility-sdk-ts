import type { ProviderEvidenceProjection } from "./provider-evidence.js";
import type { RankHistoryReportNormalizedItem } from "./rank-history-report-items.js";
import type { RankHistoryReportMetadata } from "./rank-history-report-metadata.js";
import type { RankHistoryReportRun, RankHistoryReportRunItem } from "./rank-history-report-runs.js";
import type { KeywordId, RankCheckId } from "./types.js";

/** Captured scope strings are historical values, not closed provider enums. */
export interface RankHistoryReportScope {
  device: string;
  engine: string;
  identity_revision: string | null;
  language: string;
  location: string;
  policy_revision: string | null;
  rank_scale: string;
  result_kind: string;
  surface: string;
  target_revision: string | null;
}
export interface RankHistoryReportTimes {
  checked_at: string;
  check_recorded_at: string;
  observed_at: string | null;
  recorded_at: string;
  requested_at: string | null;
}
export interface RankHistoryReportObservation extends RankHistoryReportTimes {
  /** Nullable on current servers; omitted by older servers. */
  evidence_projection?: ProviderEvidenceProjection | null;
  comparison_digest: string | null;
  complete_through: number | null;
  completeness: string;
  configured_scope: RankHistoryReportScope | null;
  effective_scope: RankHistoryReportScope | null;
  evidence: string;
  expected_url_at_check: string | null;
  freshness: string;
  freshness_as_of: string;
  freshness_reason: string | null;
  id: RankCheckId;
  keyword_id: KeywordId;
  keyword: string;
  normalization_version: string | null;
  position: number | null;
  provider: string | null;
  ranking_url: string | null;
  reason: string | null;
  reported_position: number | null;
  requested_depth: number | null;
  normalized_items: RankHistoryReportNormalizedItem[];
  normalized_item_count: number;
}
export interface RankHistoryReportAttempt extends RankHistoryReportTimes {
  /** Nullable on current servers; omitted by older servers. */
  evidence_projection?: ProviderEvidenceProjection | null;
  deferred_reason: string | null;
  error_code: string | null;
  finished_at: string | null;
  id: RankCheckId;
  keyword_id: KeywordId;
  keyword: string;
  kind: "logical_rank_check";
  provider: string | null;
  reported_provider_attempt_count: number;
  started_at: string | null;
  status: string;
}
export type RankHistoryReportRecord =
  | RankHistoryReportObservation
  | RankHistoryReportAttempt
  | RankHistoryReportRun
  | RankHistoryReportRunItem;
export interface RankHistoryReportResponse {
  data: RankHistoryReportRecord[];
  meta: { next_cursor: string | null; report: RankHistoryReportMetadata };
}
export type { RankHistoryReportMetadata };
export type { RankHistoryReportRun, RankHistoryReportRunItem };
export type { RankHistoryReportNormalizedItem };
