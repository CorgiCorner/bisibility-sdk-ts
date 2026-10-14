import type { KeywordId, RankCheckId } from "./types.js";

export interface RankHistoryReportReference {
  comparison_digest: string | null;
  evidence: string;
  freshness: string;
  freshness_reason: string | null;
  id: RankCheckId;
  normalization_version: string | null;
  observed_at: string | null;
  position: number | null;
  provider: string | null;
  ranking_url: string | null;
  reason: string | null;
  recorded_at: string;
  reported_position: number | null;
  requested_depth: number | null;
}
export interface RankHistoryReportResolution {
  baseline: RankHistoryReportReference | null;
  comparison: string;
  comparison_boundary: { point: RankHistoryReportReference | null; reason: string } | null;
  comparison_window: { before: string; not_before: string | null } | null;
  comparison_unavailable_reason: string | null;
  current: RankHistoryReportReference | null;
  event: string | null;
  keyword_id: KeywordId;
  last_success: RankHistoryReportReference | null;
  latest_attempt: {
    id: RankCheckId;
    measurement_recorded_at: string;
    observed_at: string | null;
    recorded_at: string | null;
    status: string;
  } | null;
  movement: number | null;
}
export interface RankHistoryReportCounts {
  expected: number;
  measured: number;
  metric_eligible: number;
  ranked: number;
  known_absent: number;
  unknown: number;
  never_checked: number;
  failed: number;
  stale: number;
  unsupported: number;
  fresh_determinate: number | null;
  unknown_freshness: number;
  comparable: number;
}
export interface RankHistoryReportMetric {
  metric_id: string;
  definition_version: string;
  as_of: string;
  value: number | null;
  delta: number | null;
  counts: RankHistoryReportCounts;
  data_coverage: number | null;
  observed_coverage: number | null;
  freshness: string;
  freshness_reason: string | null;
  imputed_weight_share: number | null;
  contributions: Array<{
    target_id: KeywordId;
    weight: number;
    value: number | null;
    delta: number | null;
  }>;
  exclusions: Array<{ target_id: KeywordId; reason: string }>;
  added: KeywordId[] | null;
  removed: KeywordId[] | null;
  composition_reason: string | null;
  weight_provenance: { source: string | null; period: string | null; market: string | null };
  included_count: number;
  eligible_total: number;
  is_truncated: boolean;
}
export interface RankHistoryReportMetadata {
  version: 2;
  aggregation: string;
  as_of: string;
  window: { basis: string; from: string; to: string };
  summary_basis: string;
  definition_version: string;
  metric_id: string;
  selection_digest: string;
  total_count: number;
  excluded_unknown_time: number;
  unresolved_membership_count: number;
  normalized_items: {
    total_count: number;
    completeness: string;
    is_truncated: boolean;
    capacity: number;
    paging: string;
  };
  membership: string;
  summary: {
    comparison: string;
    metric: RankHistoryReportMetric;
    movement_counts: {
      entered: number;
      exited: number;
      first: number;
      moved: number;
      re_entered: number;
      steady: number;
      unknown: number;
      improved: number;
      declined: number;
    } | null;
    retained_history: { checks: number; completeness: string; targets: number };
    selection_digest: string;
    time_basis: {
      as_of: string;
      baseline: { before: string; not_before: string | null } | null;
      current_not_before: string | null;
    };
  };
  resolutions: Array<
    RankHistoryReportResolution & {
      current_scope_state: string;
      last_known: RankHistoryReportResolution;
    }
  >;
}
