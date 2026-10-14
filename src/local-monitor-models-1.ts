import type {
  KeywordId,
  LocalMeasurementTargetId,
  LocalMonitorId,
  LocalMonitorRunId,
  ProjectId,
} from "./types.js";

// Fields derived from the actual Local retained-read OpenAPI source.

export interface LocalMonitorPointListingsResponseDataItem {
  id: string;
  name: string | null;
  rank_group: number | null;
  rank_absolute: number | null;
  promotion: string;
  observed_at: string | null;
  matched: string;
  cid: string | null;
  place_id: string | null;
  source_page: number | null;
  source_block_id: string | null;
  source_ordinal: number | null;
  rank_scale: string | null;
}

export interface LocalMonitorPointListingsResponse {
  data: LocalMonitorPointListingsResponseDataItem[];
}

export interface LocalMonitorPointReportProtocol {
  geometry: string;
  matcher: string;
  normalizerVersions: string[];
  metricDefinition: string;
}

export interface LocalMonitorPointReportFreshnessPolicy {
  basis: string | null;
  freshForMs: number | null;
  freshnessReason: string | null;
  policyEpoch: string | null;
  configurationRevision: string | null;
  semantics: string;
}

export interface LocalMonitorPointReportPointsItemReceipt {
  targetId: LocalMeasurementTargetId;
  status: string;
  version: number;
  acceptance: string | null;
  knownAcceptedTaskCount: number | null;
  collected: boolean;
  cancellationRequested: boolean;
  financialState: string | null;
  ownerRetained: boolean;
  resolution: string;
  accountingPending: boolean | null;
  reconciliationReason: string | null;
}

export interface LocalMonitorPointReportPointsItem {
  id: LocalMeasurementTargetId;
  keywordId: KeywordId;
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
  operatingSystem: string | null;
  observedAt: string | null;
  recordedAt: string | null;
  position: number | null;
  observedPosition: number | null;
  evidence: string;
  reason: string | null;
  freshness: string;
  freshnessReason: string | null;
  identityMatch: string;
  scopeClass: string;
  receipt: LocalMonitorPointReportPointsItemReceipt;
}

export interface LocalMonitorPointReportGridsItemCounts {
  expected: number;
  measured: number;
  metricEligible: number;
  ranked: number;
  knownAbsent: number;
  unknown: number;
  neverChecked: number;
  failed: number;
  stale: number;
  unsupported: number;
  freshDeterminate: number | null;
  unknownFreshness: number;
  comparable: number;
}

export interface LocalMonitorPointReportGridsItem {
  keywordId: KeywordId;
  keyword: string;
  gridRevisionKey: string;
  identityRevisionId: string;
  topN: number;
  size: number;
  pointIds: LocalMeasurementTargetId[];
  expected: number;
  observedRate: number | null;
  observedCoverage: number | null;
  dataCoverage: number | null;
  sampleBounds: [number, number] | null;
  counts: LocalMonitorPointReportGridsItemCounts;
  freshness: string;
  comparison: string;
  scope: string;
}

export interface LocalMonitorPointReport {
  version: 1;
  projectId: ProjectId;
  monitorId: LocalMonitorId;
  runId: LocalMonitorRunId;
  asOf: string;
  definitionRevisionId: string;
  identityRevisionId: string;
  subject: string;
  protocol: LocalMonitorPointReportProtocol;
  financialBasis: string;
  freshnessPolicy: LocalMonitorPointReportFreshnessPolicy | null;
  points: LocalMonitorPointReportPointsItem[];
  grids: LocalMonitorPointReportGridsItem[];
  report: "local-point-report-v1";
  scope: string;
  coordinateProof: string;
  comparison: string;
}
