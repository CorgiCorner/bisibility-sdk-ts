import type {
  BacklinksSnapshot,
  DomainOverviewHistoricalRow,
  DomainOverviewKeywordsData,
  DomainOverviewMetrics,
  DomainOverviewPagesData,
} from "./types.js";

export type StoredBacklinksReport = BacklinksSnapshot & {
  fresh_until: string;
  saved_at: string;
  stale: boolean;
  state: "fresh" | "stale";
};

export type StoredDomainOverviewReport = {
  cached: boolean;
  cost_cents: number;
  country_code: string | null;
  data_state: "no_data" | "ok" | "partial";
  fetched_at: string;
  fresh_until: string;
  history: DomainOverviewHistoricalRow[] | null;
  keywords: DomainOverviewKeywordsData | null;
  language_code: string;
  location_code: number;
  overview: DomainOverviewMetrics | null;
  pages: DomainOverviewPagesData | null;
  partial: boolean;
  previous_fetched_at: string | null;
  previous_overview: DomainOverviewMetrics | null;
  previous_source_snapshot_at: string | null;
  provider: string;
  saved_at: string;
  scope: "root" | "subdomain";
  source_snapshot_at: string | null;
  stale: boolean;
  state: "fresh" | "stale";
  target: string;
};

export type StoredKeywordResearchReport = {
  cached: boolean;
  cost_cents: number;
  country_code: string;
  fetched_at: string;
  fresh_until: string;
  include_clickstream: boolean;
  language_code: string;
  mode: string;
  partial: boolean;
  provider: string;
  request_key: string;
  result_limit: number;
  rows: {
    already_saved: boolean;
    already_tracked: boolean;
    competition: number | null;
    cpc_cents: number | null;
    difficulty: number | null;
    intent: "informational" | "commercial" | "transactional" | "navigational" | "unknown" | null;
    keyword: string;
    monthly_trend: {
      month: number;
      search_volume: number | null;
      year: number;
    }[];
    search_volume: number | null;
    source: "related" | "suggestion" | "idea";
  }[];
  saved_at: string;
  seed: string;
  sources: {
    cached: boolean;
    cost_cents: number;
    reason?:
      | "budget_exhausted"
      | "cost_limit"
      | "in_progress"
      | "needs_reauth"
      | "no_source"
      | "previous_source_failed"
      | "provider_error"
      | "rate_limited"
      | "result_limit"
      | "unsupported_location";
    returned: number;
    source: "related" | "suggestion" | "idea";
    status: "ok" | "failed" | "skipped";
  }[];
  stale: boolean;
  state: "fresh" | "stale";
};

export type StoredResearchReportResponse = {
  data: StoredBacklinksReport | StoredDomainOverviewReport | StoredKeywordResearchReport;
};

export type StoredResearchReportsResponse = {
  data: StoredResearchReportSummary[];
  meta: {
    freshness_days: number;
  };
};

export type StoredResearchReportSummary = {
  country_code?: string;
  fresh_until: string;
  include_clickstream?: boolean;
  include_subdomains?: boolean;
  kind: "backlinks" | "domain_overview" | "keyword_research";
  language_code?: string;
  location_code?: number;
  mode?: string;
  result_limit?: number;
  saved_at: string;
  seed?: string;
  state: "fresh" | "stale";
  target?: string;
  target_scope?: string;
};

export type ProviderBudgets = {
  connection_id: string;
  credential_source: "own" | "hosted";
  credits: {
    app: {
      amount_per_month: number;
      unit: "cents";
    } | null;
    programmatic: {
      amount_per_month: number;
      unit: "cents";
    } | null;
  };
  own: {
    app: {
      amount_per_month: number;
      unit: "cents" | "units";
    } | null;
    programmatic: {
      amount_per_month: number;
      unit: "cents" | "units";
    } | null;
  };
  provider: string;
  source: "connection" | "legacy_project" | "none";
};

export type ProviderBudgetsUpdate = {
  credits?: {
    app?: {
      amount_per_month: number;
      unit: "cents";
    } | null;
    programmatic?: {
      amount_per_month: number;
      unit: "cents";
    } | null;
  };
  own?: {
    app?: {
      amount_per_month: number;
      unit: "cents" | "units";
    } | null;
    programmatic?: {
      amount_per_month: number;
      unit: "cents" | "units";
    } | null;
  };
};
export type StoredResearchReportKind = "backlinks" | "domain_overview" | "keyword_research";
export type StoredResearchReportByKind = {
  backlinks: StoredBacklinksReport;
  domain_overview: StoredDomainOverviewReport;
  keyword_research: StoredKeywordResearchReport;
};
/** Select the saved report; this read never initiates provider work. */
export interface StoredResearchReportOptions {
  target?: string;
  targetScope?: string;
  mode?: string;
  includeSubdomains?: boolean;
  seed?: string;
  includeClickstream?: boolean;
  resultLimit?: 100 | 300 | 500;
  connectionId?: string;
  languageCode?: string;
  locationCode?: number;
}
