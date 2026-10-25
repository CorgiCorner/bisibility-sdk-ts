type OpenString<T extends string> = T | (string & Record<never, never>);

export type SearchIndexInspection = {
  coverage_state: string | null;
  crawled_as: SearchIndexCrawledAs;
  google_canonical: string | null;
  indexing_state: SearchIndexIndexingState;
  inspection_result_link: string | null;
  last_crawl_at: string | null;
  last_crawl_time: string | null;
  page_fetch_state: SearchIndexPageFetchState;
  referring_urls: Array<string>;
  rich_results_result: SearchIndexRichResults;
  robots_txt_state: SearchIndexRobotsTxtState;
  sitemap: Array<string>;
  user_canonical: string | null;
  verdict: SearchIndexVerdict;
} | null;

export type SearchIndexCrawledAs = string | null;

export type SearchIndexIndexingState = string | null;

export type SearchIndexPageFetchState = string | null;

export type SearchIndexRichResults = {
  detected_items: Array<SearchIndexDetectedItem>;
  verdict: SearchIndexRichResultsVerdict;
} | null;

export type SearchIndexDetectedItem = {
  issue_count: number;
  issues: Array<SearchIndexIssueCount>;
  item_count: number;
  rich_result_type: string | null;
};

export type SearchIndexIssueCount = {
  count: number;
  severity: SearchIndexIssueSeverity;
};

export type SearchIndexIssueSeverity = string | null;

export type SearchIndexRichResultsVerdict = string | null;

export type SearchIndexRobotsTxtState = string | null;

export type SearchIndexVerdict = string | null;

export type SearchIndexInspectionError = {
  code: SearchIndexInspectionErrorCode;
  message: string;
  reset_at?: string;
  scope?: SearchIndexRateLimitScope;
} | null;

export type SearchIndexInspectionErrorCode = OpenString<
  | "inspection_daily_limit"
  | "inspection_failed"
  | "provider_authorization"
  | "provider_rate_limited"
>;

export type SearchIndexRateLimitScope = OpenString<"daily" | "minute" | "unknown">;

export type SearchIndexInspectionInput = {
  urls: Array<string>;
};

export type SearchIndexInspections = {
  property: string;
  results: Array<SearchIndexInspectionRow>;
};

export type SearchIndexInspectionRow = {
  error: SearchIndexInspectionError;
  inspection: SearchIndexInspection;
  url: string;
};

export type SearchIndexSitemap = {
  contents: Array<SearchIndexSitemapContent>;
  errors: number;
  is_pending: boolean;
  is_sitemaps_index: boolean;
  last_downloaded: string | null;
  last_submitted: string | null;
  path: string;
  type: string | null;
  warnings: number;
};

export type SearchIndexSitemapContent = {
  submitted: number;
  type: string;
};

export type SearchIndexSitemapResponse = {
  property: string;
  sitemap: SearchIndexSitemap;
};

export type SearchIndexSitemaps = {
  property: string;
  sitemaps: Array<SearchIndexSitemap>;
};
