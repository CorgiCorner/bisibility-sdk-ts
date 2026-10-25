import type { SearchIndexDetectedItem, SearchIndexRichResultsVerdict } from "./search-index.js";
import type { PaginationOptions } from "./types.js";

type OpenString<T extends string> = T | (string & Record<never, never>);

export type PageIndexingHistory = {
  changes: Array<PageIndexingChange>;
  complete: boolean;
};

export type PageIndexingChange = {
  at: string;
  next: PageIndexingTrackedState;
  previous: PageIndexingTrackedState;
};

export type PageIndexingReport = {
  budget_mode: PageIndexingBudgetMode;
  checked: number;
  complete: boolean;
  discovered_at: string | null;
  discovery_complete: boolean;
  estimated_days_remaining: number | null;
  groups: Array<PageIndexingGroup>;
  last429_kind: string | null;
  newest_result_at: string | null;
  next_reset_at: string;
  oldest_result_at: string | null;
  property: string;
  remaining: number;
  today_count: number;
  total: number;
};

export type PageIndexingBudgetMode = OpenString<"off" | "fixed" | "available_quota">;

export type PageIndexingGroup = {
  budget_mode: PageIndexingBudgetMode;
  checked: number;
  complete: boolean;
  group: PageIndexingGroupKind;
  last429_kind: string | null;
  newest_result_at: string | null;
  next_reset_at: string;
  oldest_result_at: string | null;
  reasons: Array<PageIndexingReason>;
  remaining: number;
  today_count: number;
  total: number;
};

export type PageIndexingGroupKind = OpenString<
  "indexed" | "not_indexed" | "inspection_failed" | "not_checked"
>;

export type PageIndexingReason = {
  coverage_state: string | null;
  oldest_result_at: string | null;
  total: number;
};

export type PageIndexingRichResults = {
  detected_items: Array<SearchIndexDetectedItem>;
  verdict: SearchIndexRichResultsVerdict;
} | null;

export type PageIndexingSettings = {
  available_modes: Array<PageIndexingBudgetMode>;
  budget_mode: PageIndexingBudgetMode;
  inspection_daily_limit: number;
  last429_at: string | null;
  last429_kind: string | null;
  next_reset_at: string;
  property: string;
  today_count: number;
};

export type PageIndexingSettingsPatch =
  | { budget_mode: PageIndexingBudgetModeInput; inspection_daily_limit?: number }
  | { budget_mode?: PageIndexingBudgetModeInput; inspection_daily_limit: number };

export type PageIndexingBudgetModeInput = "off" | "fixed" | "available_quota";

export type PageIndexingTrackedState = {
  coverage_state: string | null;
  google_canonical: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  robots_txt_state: string | null;
  verdict: string | null;
};

export type PageIndexingUrl = {
  canonical_ok: boolean | null;
  checked_at: string | null;
  coverage_state: string | null;
  crawled_as: string | null;
  created_at: string;
  google_canonical: string | null;
  group: PageIndexingGroupKind;
  history?: PageIndexingHistory;
  indexing_state: string | null;
  inspection_error: string | null;
  inspection_failed_at: string | null;
  inspection_result_link: string | null;
  last_crawl_at: string | null;
  page_fetch_state: string | null;
  referring_urls: Array<string>;
  rich_results_summary: PageIndexingRichResults;
  robots_txt_state: string | null;
  sitemap_url: string | null;
  sitemaps: Array<string>;
  source: PageIndexingSource;
  updated_at: string;
  url: string;
  user_canonical: string | null;
  verdict: string | null;
};

export type PageIndexingSource = OpenString<"keyword_target" | "sitemap" | "manual">;

export type PageIndexingUrls = {
  data: Array<PageIndexingUrl>;
  meta: PageIndexingUrlsMeta;
};

export type PageIndexingUrlsMeta = {
  next_cursor: string | null;
};

export type PageIndexingGroupFilter =
  | "indexed"
  | "not_indexed"
  | "inspection_failed"
  | "not_checked";

export type PageIndexingSourceFilter = "keyword_target" | "sitemap" | "manual";

export type PageIndexingHistoryFilter = "true" | "false";

/** Stored URL filters; manual-only URLs require source=manual. */
export interface ListPageIndexingUrlsOptions extends PaginationOptions {
  group?: PageIndexingGroupFilter;
  coverageState?: string;
  sitemap?: string;
  source?: PageIndexingSourceFilter;
  search?: string;
  /** Include up to 100 recent changes per URL. */
  history?: PageIndexingHistoryFilter;
  /** Include URLs with a stored tracked change at or after this timestamp, before pagination. */
  changedSince?: Date | string;
}
