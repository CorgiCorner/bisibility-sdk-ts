import type {
  KeywordId,
  LocalMeasurementTargetId,
  LocalMonitorId,
  LocalMonitorRunId,
  ProjectId,
} from "./types.js";

// Fields derived from the actual Local retained-read OpenAPI source.

export interface LocalMonitorRunResultResponseDataProtocol {
  geometry: string;
  matcher: string;
  normalizer_versions: string[];
  metric_definition: string;
}

export interface LocalMonitorRunResultResponseDataFreshnessPolicy {
  basis: string | null;
  fresh_for_ms: number | null;
  freshness_reason: string | null;
  policy_epoch: string | null;
  configuration_revision: string | null;
  semantics: string;
}

export interface LocalMonitorRunResultResponseDataPointsItemReceipt {
  target_id: LocalMeasurementTargetId;
  status: string;
  version: number;
  acceptance: string | null;
  known_accepted_task_count: number | null;
  collected: boolean;
  cancellation_requested: boolean;
  financial_state: string | null;
  owner_retained: boolean;
  resolution: string;
  accounting_pending: boolean | null;
  reconciliation_reason: string | null;
}

export interface LocalMonitorRunResultResponseDataPointsItem {
  id: LocalMeasurementTargetId;
  keyword_id: KeywordId;
  keyword: string;
  ordinal: number;
  row: number;
  column: number;
  latitude: string;
  longitude: string;
  surface: string;
  cutoff: number;
  zoom: number | null;
  language: string;
  device: string;
  operating_system: string | null;
  observed_at: string | null;
  recorded_at: string | null;
  position: number | null;
  observed_position: number | null;
  evidence: string;
  reason: string | null;
  freshness: string;
  freshness_reason: string | null;
  identity_match: string;
  scope_class: string;
  receipt: LocalMonitorRunResultResponseDataPointsItemReceipt;
}

export interface LocalMonitorRunResultResponseDataGridsItemCounts {
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

export interface LocalMonitorRunResultResponseDataGridsItem {
  keyword_id: KeywordId;
  keyword: string;
  grid_revision_key: string;
  identity_revision_id: string;
  top_n: number;
  size: number;
  point_ids: LocalMeasurementTargetId[];
  expected: number;
  observed_rate: number | null;
  observed_coverage: number | null;
  data_coverage: number | null;
  sample_bounds: [number, number] | null;
  counts: LocalMonitorRunResultResponseDataGridsItemCounts;
  freshness: string;
  comparison: string;
  scope: string;
}

export interface LocalMonitorRunResultResponseDataReceiptCounts {
  items: number;
  complete: number;
  acceptance_unresolved: number;
  accounting_pending: number;
  unavailable: number;
  retained_owners: number;
}

export interface LocalMonitorRunResultResponseDataReceipt {
  id: LocalMonitorRunId;
  version: number;
  cancellation_requested: boolean;
  expected_count: number;
  items: LocalMonitorRunResultResponseDataPointsItemReceipt[];
  counts: LocalMonitorRunResultResponseDataReceiptCounts;
}

export interface LocalMonitorRunResultResponseData {
  version: 1;
  project_id: ProjectId;
  monitor_id: LocalMonitorId;
  run_id: LocalMonitorRunId;
  as_of: string;
  definition_revision_id: string;
  identity_revision_id: string;
  subject: string;
  protocol: LocalMonitorRunResultResponseDataProtocol;
  financial_basis: string;
  freshness_policy: LocalMonitorRunResultResponseDataFreshnessPolicy | null;
  points: LocalMonitorRunResultResponseDataPointsItem[];
  grids: LocalMonitorRunResultResponseDataGridsItem[];
  created_at: string;
  definition_revision: number;
  receipt: LocalMonitorRunResultResponseDataReceipt;
}

export interface LocalMonitorRunResultResponse {
  data: LocalMonitorRunResultResponseData;
}

export interface LocalMonitorRunHistoryResponseDataWindow {
  from: string | null;
  to: string;
  time_basis: string;
}

export interface LocalMonitorRunHistoryResponseDataItemsItem {
  run_id: LocalMonitorRunId;
  created_at: string;
  definition_revision: number;
  mode: string;
}

export interface LocalMonitorRunHistoryResponseData {
  version: 1;
  project_id: ProjectId;
  monitor_id: LocalMonitorId;
  as_of: string;
  window: LocalMonitorRunHistoryResponseDataWindow | null;
  eligible_total: number | null;
  next_cursor: string | null;
  items: LocalMonitorRunHistoryResponseDataItemsItem[];
}

export interface LocalMonitorRunHistoryResponse {
  data: LocalMonitorRunHistoryResponseData;
}

export interface LocalMonitorPointHistoryResponseDataItemsItem {
  id: string;
  run_id: LocalMonitorRunId;
  created_at: string;
  observed_at: string | null;
  position: number | null;
  evidence: string;
  reason: string | null;
  freshness: string | null;
  freshness_reason: string | null;
}

export interface LocalMonitorPointHistoryResponseData {
  version: 1;
  as_of: string;
  target_id: LocalMeasurementTargetId;
  scope: string;
  limit: number;
  has_more: boolean;
  window: LocalMonitorRunHistoryResponseDataWindow | null;
  eligible_total: number | null;
  next_cursor: string | null;
  policy_epoch: string | null;
  freshness_configuration_revision: string | null;
  items: LocalMonitorPointHistoryResponseDataItemsItem[];
}

export interface LocalMonitorPointHistoryResponse {
  data: LocalMonitorPointHistoryResponseData;
}
