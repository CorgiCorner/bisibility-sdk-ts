import type { PublicIdForPrefix } from "./public-id.js";

export type AlertId = PublicIdForPrefix<"alert">;
export type ApiKeyId = PublicIdForPrefix<"key">;
export type AuditId = PublicIdForPrefix<"audit">;
export type CloudImportJobId = PublicIdForPrefix<"job">;
export type CompetitorId = PublicIdForPrefix<"comp">;
export type ConnectionId = PublicIdForPrefix<"conn">;
export type IngestHookId = PublicIdForPrefix<"hook">;
export type InviteId = PublicIdForPrefix<"invite">;
export type KeywordId = PublicIdForPrefix<"kw">;
export type MembershipId = PublicIdForPrefix<"member">;
export type MigrationTokenId = PublicIdForPrefix<"mtok">;
export type NotificationId = PublicIdForPrefix<"notif">;
export type PersonalAccessTokenId = PublicIdForPrefix<"pat">;
export type ProjectId = PublicIdForPrefix<"prj">;
export type RankCheckId = PublicIdForPrefix<"check">;
export type SavedKeywordId = PublicIdForPrefix<"skw">;
export type SavedViewId = PublicIdForPrefix<"view">;
export type SessionId = PublicIdForPrefix<"ses">;
export type SignalId = PublicIdForPrefix<"sig">;
export type TagId = PublicIdForPrefix<"tag">;
export type UserId = PublicIdForPrefix<"usr">;
export type WebhookId = PublicIdForPrefix<"webhook">;
export type AlertRuleId = PublicIdForPrefix<"rule">;

export type Device = "desktop" | "mobile";

export type RankCheckFrequency =
  | "paused"
  | "manual"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom_cron";

export type JsonObject = Record<string, unknown>;

export type RequestHeaders = HeadersInit;

export interface ProblemDetails {
  detail?: string;
  docs_url?: string;
  errors?: unknown;
  instance?: string;
  status?: number;
  title?: string;
  type?: string;
}

export interface ListMeta {
  next_cursor: string | null;
  [key: string]: unknown;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

export interface DataResponse<T> {
  data: T;
  meta?: JsonObject;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export type ProjectWriteMode = "active" | "migration_hold" | "migrated";

export interface Project {
  created_at: string;
  domain: string;
  id: ProjectId;
  name: string;
  updated_at: string;
  write_mode: ProjectWriteMode;
}

export interface UpdateProjectInput {
  domain?: string;
  name?: string;
}

export interface ProjectDefaults {
  city: string | null;
  country: string;
  cron_expression: string | null;
  device: Device;
  frequency: RankCheckFrequency;
  jitter_minutes: number;
  last_checked_at: string | null;
  location_key: string;
  next_check_at: string | null;
  project_id: ProjectId;
  serp_depth: number;
  serp_stop_on_match: boolean;
  source: "derived" | "explicit" | "fallback";
  timezone: string;
  updated_at: string | null;
}

export interface ProjectDefaultsPatch {
  city?: string | null;
  country?: string;
  cron_expression?: string | null;
  device?: Device;
  frequency?: RankCheckFrequency;
  jitter_minutes?: number;
  location_key?: string;
  serp_stop_on_match?: boolean;
  timezone?: string;
}

export type ProjectOverviewRange = "7d" | "28d" | "90d";

export type ProjectOverviewDevice = "all" | Device;

export interface ProjectOverviewOptions {
  device?: ProjectOverviewDevice;
  range?: ProjectOverviewRange;
  tag?: string;
}

export interface ProjectOverviewPositionDistribution {
  count: number | null;
  max: number;
  min: number;
}

export interface ProjectOverview {
  average_position: number | null;
  average_position_delta: number | null;
  keywords_added_this_month: number;
  last_check_at: string | null;
  next_check_at: string | null;
  position_distribution: ProjectOverviewPositionDistribution[];
  project_id: ProjectId;
  top_10_count: number | null;
  top_10_delta: number | null;
  top_100_count: number | null;
  top_3_count: number | null;
  tracked_keyword_count: number;
  visibility: number | null;
  visibility_delta: number | null;
}

export interface KeywordMatchRequest {
  texts: readonly string[];
}

export interface KeywordMatchMarket {
  country_code: string;
  device: Device;
  location: string;
  location_key: string;
}

export interface KeywordMatch {
  keyword_id: KeywordId;
  latest_position: number | null;
  market: KeywordMatchMarket;
  /** Trimmed, lowercase request text used to match this keyword. */
  matched_text: string;
  previous_position: number | null;
  /**
   * URL that ranked at `latest_position` in the last completed check, or null when the keyword has
   * no completed check.
   */
  ranking_url: string | null;
  /** Stored keyword text, which can differ in case and whitespace from matched_text. */
  text: string;
}

export interface KeywordMatchMeta {
  /** Normalized texts with more than 100 matching markets; their returned rows are partial. */
  truncated_texts: string[];
}

export interface KeywordMatchResponse {
  data: KeywordMatch[];
  meta: KeywordMatchMeta;
}

export type TrackingScope = "city" | "country";

export type LocationKind = "city" | "country" | "region";

export interface LocationSuggestion {
  city_name: string | null;
  country_code: string;
  display_name: string;
  hl: string;
  kind: LocationKind;
  language_label: string;
  location_key: string;
  region_code: string | null;
  region_name: string | null;
}

export type LocationSuggestionsResponse = ListResponse<LocationSuggestion>;

export interface SearchLocationsOptions {
  country?: string;
  limit?: number;
  q: string;
}

export interface CreateProjectInput {
  /** Initial rank-check schedule defaults for the project. */
  defaults?: ProjectDefaultsPatch;
  domain: string;
  name: string;
  /** Location granularity for rank tracking. Defaults to "country" on the server. */
  tracking_scope?: TrackingScope;
}

export interface ApiKey {
  created_at: string;
  expires_at: string | null;
  id: ApiKeyId;
  last_used_at: string | null;
  name: string;
  prefix: string;
  revoked_at: string | null;
  scope: ApiKeyScope;
}

export interface CreatedApiKey extends ApiKey {
  masked_value: string;
  token: string;
}

export type ApiKeyScope = "admin" | "read" | "write";

export interface CreateApiKeyInput {
  /** Days until the key expires, or null for no expiry. */
  expires_in_days?: 30 | 90 | 365 | null;
  name: string;
  /** Access tier. Defaults to admin for backward compatibility. */
  scope?: ApiKeyScope;
}

export type MembershipRole = "admin" | "auditor" | "member" | "owner" | "viewer";

export interface MeProject {
  domain: string;
  id: ProjectId;
  name: string;
  role: MembershipRole;
}

export interface Me {
  email: string;
  id: UserId;
  name: string;
  projects: MeProject[];
}

export interface UpdateMeInput {
  name: string;
}

export type PersonalAccessTokenScope = "admin" | "read" | "write";

export interface PersonalAccessToken {
  created_at: string;
  expires_at: string | null;
  id: PersonalAccessTokenId;
  last_used_at: string | null;
  name: string;
  prefix: string;
  revoked_at: string | null;
  scope: PersonalAccessTokenScope;
}

export interface CreatedPersonalAccessToken extends PersonalAccessToken {
  masked_value: string;
  token: string;
}

export interface CreateMyTokenInput {
  /** Days until the token expires, or null for no expiry. Defaults to null. */
  expires_in_days?: 30 | 90 | 365 | null;
  name: string;
  /** Token scope. Defaults to "read" on the server. */
  scope?: PersonalAccessTokenScope;
}

export interface Webhook {
  created_at: string;
  description: string | null;
  enabled: boolean;
  id: WebhookId;
  last_delivery_at: string | null;
  updated_at: string;
  url: string;
}

export interface CreateWebhookInput {
  description?: string | null;
  enabled?: boolean;
  /** HMAC signing secret (minimum 16 characters). Write-only; never returned by the API. */
  hmac_secret: string;
  url: string;
}

export interface UpdateWebhookInput {
  description?: string | null;
  enabled?: boolean;
  /** HMAC signing secret (minimum 16 characters). Write-only; never returned by the API. */
  hmac_secret?: string;
  url?: string;
}

export interface KeywordSchedule {
  cron_expression: string | null;
  frequency: RankCheckFrequency;
  jitter_minutes: number;
  last_checked_at: string | null;
  next_check_at: string | null;
  timezone: string;
}

export interface Keyword {
  country: string;
  created_at: string;
  device: Device;
  id: KeywordId;
  intent: string | null;
  latest_position: number | null;
  location: string;
  previous_position: number | null;
  project_id: ProjectId;
  ranking_url: string | null;
  schedule: KeywordSchedule | null;
  tags: string[];
  target_url: string | null;
  text: string;
  topic: string | null;
  updated_at: string;
}

export interface KeywordScheduleInput {
  cron_expression: string | null;
  frequency: RankCheckFrequency;
  jitter_minutes?: number;
  timezone?: string;
}

export interface CreateKeywordInput {
  city?: string | null;
  country?: string;
  device?: Device;
  intent?: string | null;
  keyword: string;
  location?: string;
  location_key?: string;
  schedule?: KeywordScheduleInput;
  tags?: readonly string[];
  target_url?: string | null;
  topic?: string | null;
}

export type CreateKeywordItem = string | CreateKeywordInput;

export type CreateKeywordsInput =
  | CreateKeywordInput
  | readonly CreateKeywordInput[]
  | {
      keywords: readonly CreateKeywordItem[];
    };

type OpenString<T extends string> = T | (string & Record<never, never>);

export interface CreateKeywordResult {
  keyword: Keyword;
  status: OpenString<"created" | "skipped">;
  warning?: string;
}

export interface CreateKeywordsResponse {
  created: number;
  results: CreateKeywordResult[];
  skipped: number;
  warnings?: string[];
}

export interface UpdateKeywordInput {
  city?: string | null;
  country?: string;
  device?: Device;
  frequency?: RankCheckFrequency;
  intent?: string | null;
  keyword?: string;
  location?: string;
  location_key?: string;
  schedule?: KeywordScheduleInput;
  tags?: readonly string[];
  target_url?: string | null;
  topic?: string | null;
}

export type KeywordBulkOperation =
  | "add_tags"
  | "delete"
  | "remove_tags"
  | "set_frequency"
  | "set_target_url";

export type KeywordBulkInput =
  | {
      keyword_ids: readonly KeywordId[];
      operation: "add_tags" | "remove_tags";
      tags: readonly string[];
    }
  | {
      keyword_ids: readonly KeywordId[];
      operation: "delete";
    }
  | {
      keyword_ids: readonly KeywordId[];
      operation: "set_frequency";
      frequency?: RankCheckFrequency;
      schedule?: KeywordScheduleInput;
    }
  | {
      keyword_ids: readonly KeywordId[];
      operation: "set_target_url";
      target_url?: string | null;
    };

export interface KeywordBulkItemResult {
  keyword_id: KeywordId;
  status: OpenString<"deleted" | "not_found" | "updated">;
}

export interface KeywordBulkResponse {
  operation: KeywordBulkOperation;
  results: KeywordBulkItemResult[];
}

export interface ListKeywordsOptions extends PaginationOptions {
  country?: string;
  device?: Device;
  intent?: string;
  positionGt?: number;
  positionLt?: number;
  search?: string;
  sort?:
    | "created_at"
    | "-created_at"
    | "keyword"
    | "-keyword"
    | "text"
    | "-text"
    | "updated_at"
    | "-updated_at";
  tag?: string;
  topic?: string;
}

export interface RankedKeywordSuggestion {
  already_tracked: boolean;
  estimated_traffic: number | null;
  keyword: string;
  position: number | null;
  search_volume: number | null;
}

export interface RankedKeywordConnection {
  id: ConnectionId;
  label: string;
  provider: "dataforseo";
}

export interface RankedKeywordSuggestionsResponse {
  cached: boolean;
  connections: RankedKeywordConnection[];
  cost_cents: number;
  fetched_at: string;
  offset: number;
  rows: RankedKeywordSuggestion[];
  total_count: number | null;
}

export interface ListRankedKeywordSuggestionsOptions {
  connectionId?: ConnectionId;
  fresh?: boolean;
  limit?: number;
  offset?: number;
}

export type KeywordMetricsIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "unknown";

export interface KeywordMonthlyTrend {
  month: number;
  search_volume: number | null;
  year: number;
}

export interface KeywordMetrics {
  competition: number | null;
  cpc_cents: number | null;
  difficulty: number | null;
  intent: KeywordMetricsIntent | null;
  monthly_trend: KeywordMonthlyTrend[];
  search_volume: number | null;
}

export interface KeywordMetricsRow extends KeywordMetrics {
  keyword: string;
}

export interface KeywordResearchConnection {
  id: ConnectionId;
  label: string;
  provider: string;
}

export interface BacklinksSummary {
  backlinks_total: number;
  broken_backlinks: number;
  broken_pages: number;
  dofollow_pct: number;
  domain_rank: number;
  lost_backlinks: number;
  lost_referring_domains: number;
  new_backlinks: number;
  new_referring_domains: number;
  referring_domains_total: number;
  referring_pages: number;
  spam_score: number;
}

export interface BacklinksHistoryMonth {
  lost_links: number;
  month: string;
  new_links: number;
}

export interface BacklinkRow {
  anchor: string;
  domain_authority: number;
  first_seen: string;
  flags: ("nofollow" | "ugc" | "sponsored" | "image" | "sitewide")[];
  links_count: number;
  lost_at: string | null;
  source_domain: string;
  source_url: string;
  spam_score: number;
  status: "active" | "new" | "lost";
  target_url: string;
}

export interface BacklinksSnapshot {
  cached: boolean;
  cached_until: string;
  cost_cents: number;
  estimate?: boolean;
  estimated_cost_cents?: number;
  fetched_at: string;
  fetched_row_count: number;
  history: BacklinksHistoryMonth[];
  include_subdomains: boolean;
  provider: string;
  rows: BacklinkRow[];
  summary: BacklinksSummary;
  target: string;
  target_scope: "site" | "page";
  total_rows_available: number;
}

/**
 * Options for analyzing backlinks. This operation requires API write scope because a cache miss
 * can spend the project's provider budget. Use `estimateOnly` (`estimate_only` on the wire) for a
 * free dry run.
 */
export interface AnalyzeBacklinksOptions {
  estimateOnly?: boolean;
  fresh?: boolean;
  includeSubdomains?: boolean;
  maxCostCents?: number;
  mode?: "as_is" | "one_per_domain";
  resultLimit?: 100 | 300 | 500 | 1000;
  target: string;
  targetScope?: "site" | "page";
}

/**
 * Options for loading more rows into an unexpired backlinks snapshot. This operation requires API
 * write scope and spends provider budget.
 */
export interface LoadMoreBacklinkRowsOptions {
  includeSubdomains: boolean;
  limit: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
  target: string;
  targetScope: "site" | "page";
}

export type KeywordResearchMode = "auto" | "related" | "suggestions" | "ideas";

export type KeywordResearchResultLimit = 100 | 300 | 500;

export type KeywordResearchSource = "related" | "suggestion" | "idea";

export type KeywordResearchSourceReason =
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

export type KeywordResearchSourceStatus = "ok" | "failed" | "skipped";

export interface KeywordResearchRow extends KeywordMetricsRow {
  already_tracked: boolean;
  source: KeywordResearchSource;
}

export interface KeywordResearchSourceDiagnostic {
  cached: boolean;
  cost_cents: number;
  reason?: KeywordResearchSourceReason;
  returned: number;
  source: KeywordResearchSource;
  status: KeywordResearchSourceStatus;
}

export interface KeywordResearchResponse {
  cached: boolean;
  connections: KeywordResearchConnection[];
  cost_cents: number;
  estimate?: boolean;
  fetched_at: string;
  provider: string;
  rows: KeywordResearchRow[];
  sources: KeywordResearchSourceDiagnostic[];
  total_count: number;
}

export interface ResearchKeywordsOptions {
  connectionId?: ConnectionId;
  estimateOnly?: boolean;
  fresh?: boolean;
  includeClickstream?: boolean;
  maxCostCents?: number;
  mode?: KeywordResearchMode;
  resultLimit?: KeywordResearchResultLimit;
  seed: string;
}

export interface GetKeywordMetricsInput {
  connection_id?: ConnectionId;
  estimate_only?: boolean;
  fresh?: boolean;
  include_clickstream?: boolean;
  /** One to 700 keyword strings. */
  keywords: readonly string[];
  max_cost_cents?: number;
}

export interface KeywordMetricsResponse {
  cached_count: number;
  connections: KeywordResearchConnection[];
  cost_cents: number;
  estimate?: boolean;
  estimated_cost_cents?: number;
  fetched_at: string;
  fetched_count: number;
  fetched_count_estimate?: number;
  provider: string;
  rows: KeywordMetricsRow[];
  total_count: number;
}

export type RankHistoryExportRange = "30" | "90" | "all";

export type RankHistoryExportGranularity = "daily" | "weekly";

export interface RankHistoryExportRow {
  checked_at: string;
  id: RankCheckId;
  keyword: string;
  keyword_id: KeywordId;
  position: number | null;
  previous_position: number | null;
  ranking_url: string | null;
}

export type RankHistoryExportResponse = ListResponse<RankHistoryExportRow>;

interface RankHistoryExportOptions {
  granularity?: RankHistoryExportGranularity;
  keywordIds?: readonly KeywordId[];
  range?: RankHistoryExportRange;
}

export interface ExportRankHistoryJsonOptions extends PaginationOptions, RankHistoryExportOptions {
  format?: "json";
}

export interface ExportRankHistoryCsvOptions extends RankHistoryExportOptions {
  format: "csv";
}

export type SitemapMonitorStatus = "active" | "disabled" | "pending";

export interface SitemapMonitorSnapshot {
  fetched_at: string;
  sitemap_url: string;
  url_count: number;
}

export interface SitemapMonitor {
  enabled: boolean;
  id: ProjectId;
  latest_snapshot: SitemapMonitorSnapshot | null;
  project_id: ProjectId;
  sitemap_url: string | null;
  status: SitemapMonitorStatus;
}

export type SitemapMonitorListResponse = ListResponse<SitemapMonitor>;

export interface UpdateSitemapMonitorInput {
  enabled: boolean;
}

export type RankCheckStatus = "completed" | "failed" | "running";

export interface RankCheckAttempt {
  message: string;
  provider: string;
}

export interface RankCheck {
  attempts: RankCheckAttempt[] | null;
  checked_at: string;
  cost_cents: number | null;
  error: string | null;
  id: RankCheckId;
  keyword_id: KeywordId;
  position: number | null;
  previous_position: number | null;
  provider: string;
  ranking_url: string | null;
  status: RankCheckStatus;
}

export interface ListRankChecksOptions extends PaginationOptions {
  since?: Date | string;
  status?: RankCheckStatus;
  until?: Date | string;
}

export interface RunRankCheckInput {
  provider_id?: ProviderId;
}

export interface RunRankCheckOptions extends RequestOptions {
  async?: boolean;
}

export type AlertConditionType =
  | "change_pct"
  | "competitor_overtake"
  | "ctr_drop"
  | "downtrend"
  | "enters_top_n"
  | "exits_top_n"
  | "position_drop"
  | "serp_feature"
  | "threshold"
  | "url_mismatch";

export type AlertChannel = "email" | "slack" | "webhook";

export type AlertTargetType = "all" | "keyword" | "tag";

export type AlertSeverity = "info" | "urgent" | "warning";

interface AlertRuleBase {
  change_pct?: number | string | null;
  channel?: string;
  channels: AlertChannel[];
  condition?: string;
  condition_type: AlertConditionType;
  competitor_domain?: string | null;
  created_at?: string;
  enabled: boolean;
  fires?: string;
  id: AlertRuleId;
  name: string;
  period?: string;
  recipient_ids: UserId[];
  scope?: string;
  serp_feature?: string | null;
  severity?: AlertSeverity;
  status?: OpenString<"active" | "paused">;
  threshold_position?: number | null;
  top_n?: number | null;
  updated_at?: string;
}

export type AlertRule =
  | (AlertRuleBase & { target_ids: KeywordId[]; target_type: "keyword" })
  | (AlertRuleBase & { target_ids: TagId[]; target_type: "tag" })
  | (AlertRuleBase & { target_ids: []; target_type: "all" });

interface AlertRuleInputBase {
  change_pct?: number | null;
  channels?: readonly AlertChannel[];
  condition_type: AlertConditionType;
  competitor_domain?: string | null;
  drop_positions?: number | null;
  enabled?: boolean;
  name: string;
  recipient_ids?: readonly UserId[];
  serp_feature?: string | null;
  severity?: AlertSeverity;
  threshold_position?: number | null;
  top_n?: number | null;
}

export type AlertRuleInput =
  | (AlertRuleInputBase & { target_ids?: readonly []; target_type?: "all" })
  | (AlertRuleInputBase & { target_ids: readonly KeywordId[]; target_type: "keyword" })
  | (AlertRuleInputBase & { target_ids: readonly TagId[]; target_type: "tag" });

export type CreateAlertRuleInput = AlertRuleInput;

export type UpdateAlertRuleInput = AlertRuleInput;

export interface DeleteAlertRuleResponse {
  deleted: boolean;
}

export interface TriggeredAlert {
  action: string;
  ctas: string[];
  current: string;
  headline: string;
  id: AlertId;
  keyword: string;
  previous: string;
  rule: string;
  severity: AlertSeverity;
  unread: boolean;
  when: string;
}

export interface TriggeredAlertMuteResult {
  muted: true;
  snoozed_until: string | null;
}

export interface TriggeredAlertsReadResult {
  updated: number;
}

export type TeamRole = "admin" | "member" | "owner" | "viewer";

export type TeamRoleLabel = "Admin" | "Editor" | "Owner" | "Viewer";

export interface TeamMember {
  color: OpenString<"accent" | "blue" | "purple">;
  email: string;
  id: MembershipId;
  initials: string;
  name: string;
  role: TeamRoleLabel;
  role_value: TeamRole;
}

export interface TeamInvite {
  email: string;
  expires_label: string;
  id: InviteId;
  invited_label: string;
  role: TeamRoleLabel;
  role_value: Exclude<TeamRole, "owner">;
}

export interface CreateTeamInviteInput {
  email: string;
  role: Exclude<TeamRole, "owner">;
}

export interface CreatedTeamInvite {
  expires_at: string;
  id: InviteId;
  invite_link: string;
}

export interface RevokedTeamInvite {
  id: InviteId;
}

export type AssignableTeamRole = Exclude<TeamRole, "owner">;

export interface UpdateTeamMemberRoleInput {
  role: AssignableTeamRole;
}

export interface TeamMemberRoleResult {
  id: MembershipId;
  role: AssignableTeamRole;
}

export interface TeamMemberMutationResult {
  id: MembershipId;
}

export interface TeamInviteResendResult {
  expires_at: string;
  id: InviteId;
  invite_link: string;
}

export type ProviderId = "dataforseo" | "ga4" | "gsc" | "plausible" | "serpapi";

export type ProviderKind = "analytics" | "enrichment" | "serp";

export type ProviderStatus = OpenString<"connected" | "optional" | "planned" | "ready">;

export type ProviderIconName =
  | "chart"
  | "database"
  | "globe"
  | "link"
  | "magnifier"
  | "table"
  | "trend";

export interface ProviderMetaRow {
  label: string;
  value: string;
}

export interface ProviderCredentialField {
  label: string;
  name: OpenString<"login" | "secret">;
  placeholder: string;
  type?: OpenString<"password" | "text">;
}

export interface ProviderDrawerDefaults {
  cost_per_check: number;
  depth: string;
  device: string;
  enabled?: boolean;
  language: string;
  location: string;
  login: string;
  primary: boolean;
  priority?: number;
  secret: string;
}

export interface ProviderDrawer {
  activities: ProviderMetaRow[];
  cost_help: string;
  credential_fields: ProviderCredentialField[];
  defaults: ProviderDrawerDefaults;
  env_hint: string;
  primary_toggle_label: string;
}

export interface Provider {
  category_id: string;
  category_title: string;
  description: string;
  drawer: ProviderDrawer;
  enabled?: boolean;
  icon: ProviderIconName;
  id: OpenString<ProviderId>;
  logo_domain?: string;
  meta: ProviderMetaRow[];
  name: string;
  primary?: boolean;
  priority?: number;
  secondary_action?: string;
  status: ProviderStatus;
  tint: string;
}

export interface ProviderCredentialsInput {
  api_key?: string;
  endpoint?: string;
  login?: string;
  secret?: string;
}

export interface ConnectProviderInput {
  cost_per_check?: number;
  credentials?: ProviderCredentialsInput;
  enabled?: boolean;
  login?: string;
  primary?: boolean;
  priority?: number;
  secret?: string;
}

export interface TestProviderConnectionInput {
  credentials?: ProviderCredentialsInput;
  login?: string;
  secret?: string;
}

export interface ProviderSettingsInput {
  enabled?: boolean;
  primary?: boolean;
  priority?: number;
}

export interface ProviderConnection {
  cost_per_check_cents: number | string | null;
  created_at: string;
  credentials_hash?: string | null;
  enabled: boolean;
  id: ConnectionId;
  is_primary: boolean;
  kind: ProviderKind;
  last_used_at: string | null;
  priority: number;
  project_id: ProjectId;
  provider: OpenString<ProviderId>;
  status: ProviderStatus;
  updated_at: string;
}

export interface ProviderTestResult {
  balance?: number;
  message: string;
  ok: boolean;
}

export interface ProviderDisconnectResponse {
  ok: boolean;
}

export type SavedViewFilterChange = "any" | "down" | "lost" | "new" | "up";

export type SavedViewFilterCountry = "all" | "de" | "gb" | "pl" | "us";

export type SavedViewFilterDevice = "all" | Device;

export type SavedViewPositionFilter = "11-50" | "51-100" | "top10" | "top3";

export type SavedViewSerpFilter = "ai" | "featured" | "image" | "paa" | "sitelinks" | "video";

export interface KeywordSavedViewFilters {
  change: SavedViewFilterChange;
  contains: string;
  intents: string[];
  last_check: "any" | RankCheckStatus;
  position: SavedViewPositionFilter[];
  serp: SavedViewSerpFilter[];
  tags: string[];
  topics: string[];
  url_changed: boolean;
  vol_max: number;
  vol_min: number;
  wrong_url: boolean;
}

export type SavedViewFilters = KeywordSavedViewFilters;

export interface KeywordSavedViewConfig {
  filters: KeywordSavedViewFilters;
  lens: {
    device: SavedViewFilterDevice;
    location_id: string | null;
  };
  search: string;
  surface: "keywords";
  version: 1;
}

export interface CompetitorSavedViewConfig {
  filters: {
    excluded_keyword_ids: KeywordId[];
    position: "all" | "top10" | "top3";
    tag: string | null;
  };
  scope: {
    device: Device;
    engine: "google";
    location_id: string;
  };
  surface: "competitors";
  version: 1;
}

export type SavedViewConfig = CompetitorSavedViewConfig | KeywordSavedViewConfig;

export interface CreateSavedViewInput {
  config: SavedViewConfig;
  name: string;
  surface?: SavedViewSurface;
}

export type SavedViewSurface = "competitors" | "keywords";

export interface ListSavedViewsOptions extends PaginationOptions {
  surface?: SavedViewSurface;
}

export interface SavedView {
  config: SavedViewConfig;
  created_at: string;
  created_by_id: UserId | null;
  id: SavedViewId;
  name: string;
  surface: SavedViewSurface;
}

export interface DeleteSavedViewResponse {
  deleted: boolean;
}

export interface Competitor {
  domain: string;
  id: CompetitorId;
  initials?: string;
  label: string | null;
}

export interface AddCompetitorInput {
  domain: string;
  label?: string;
}

export interface RemoveCompetitorResponse {
  removed: boolean;
}

export type CompetitorKind = "Managed" | "You";

export interface CompetitorColumn {
  domain: string;
  id?: CompetitorId;
  kind: CompetitorKind;
  label: string;
}

export interface CompetitorShare {
  color: string;
  domain: string;
  id?: CompetitorId;
  initials: string;
  kind: CompetitorKind;
  label: string;
  share_of_voice: number;
  shared_keywords: number;
}

export interface HeadToHeadRow {
  gap: number | null;
  keyword: string;
  ranks: CompetitorRankMap;
}

export type CompetitorRankMap = { you?: number | null } & Partial<
  Record<CompetitorId, number | null>
>;

export interface CompetitorMarket {
  checked_keyword_count: number;
  columns: CompetitorColumn[];
  competitor_count: number;
  country: string;
  device: string;
  engine: string;
  has_rank_data: boolean;
  key: string;
  rows: HeadToHeadRow[];
  shares: CompetitorShare[];
  shared_keyword_count: number;
  tracked_keyword_count: number;
}

export interface SuggestedCompetitor {
  domain: string;
  initials: string;
  overlap: number;
}

export interface CompetitorListMeta extends ListMeta {
  markets: CompetitorMarket[];
  suggestions: SuggestedCompetitor[];
}

export interface CompetitorListResponse extends ListResponse<Competitor> {
  meta: CompetitorListMeta;
}

export interface NotificationPreferences {
  alert_email: boolean;
  alert_in_app: boolean;
  alert_slack: boolean;
  alert_webhook: boolean;
  check_email: boolean;
  check_in_app: boolean;
  email?: string;
  email_verification?: "unverified" | "verified";
  import_email: boolean;
  import_in_app: boolean;
  invite_email: boolean;
  invite_in_app: boolean;
  project_id: ProjectId;
  slack_available?: boolean;
  webhook_available?: boolean;
}

export type UpdateNotificationPreferencesInput = Partial<
  Pick<
    NotificationPreferences,
    | "alert_email"
    | "alert_in_app"
    | "alert_slack"
    | "alert_webhook"
    | "check_email"
    | "check_in_app"
    | "import_email"
    | "import_in_app"
    | "invite_email"
    | "invite_in_app"
  >
>;

export interface ListTrafficSnapshotsOptions {
  endDate: Date | string;
  limit?: number;
  offset?: number;
  paths?: readonly string[];
  startDate: Date | string;
}

export interface PageTrafficSnapshot {
  bounce_rate: number | null;
  created_at: string;
  date: string;
  engagement_rate: number | null;
  key_events: number | null;
  path: string;
  provider: string;
  scroll_depth: number | null;
  sessions: number;
  updated_at: string;
  visit_duration_seconds: number | null;
  visitors: number | null;
  window_days: number;
}

export interface PageTrafficSnapshotsResponse {
  offset: number;
  rows: PageTrafficSnapshot[];
  total_count: number;
}

export interface ListSearchPerformanceQueryStatsOptions {
  connectionId?: ConnectionId;
  endDate: Date | string;
  limit?: number;
  query?: string;
  startDate: Date | string;
}

export interface AnalyticsConnection {
  id: ConnectionId;
  label: string;
  provider: string;
}

export interface SearchPerformanceQueryStat {
  clicks: number;
  ctr: number;
  impressions: number;
  page?: string | null;
  position: number;
  query: string;
}

export interface SearchPerformanceQueryStatsResponse {
  connection: AnalyticsConnection;
  rows: SearchPerformanceQueryStat[];
}

export type TrafficSyncRunStatus =
  | "succeeded_with_data"
  | "succeeded_empty"
  | "deferred_rate_limit"
  | "failed"
  | "not_applicable";

export interface TrafficSyncRun {
  connection_id: ConnectionId;
  error?: string;
  error_class?: string;
  provider: string;
  rows_fetched: number;
  rows_matched: number;
  rows_upserted: number;
  status: TrafficSyncRunStatus;
  truncated: boolean;
}

export type TrafficSyncSkippedReason = "no_capability" | "rate_limited";

export interface TrafficSyncSkippedConnection {
  provider: string;
  reason: TrafficSyncSkippedReason;
}

export interface TrafficSyncSummary {
  connections: number;
  keyword_snapshots: number;
  page_snapshots: number;
  project_id: ProjectId;
  runs: TrafficSyncRun[];
  skipped: TrafficSyncSkippedConnection[];
}

export type MigrationScope = "full" | "keywords";

export type CloudImportState = "done" | "failed" | "idle" | "importing" | "receiving";

export interface CloudImportJob {
  counts: unknown;
  created_at: string | null;
  error: string | null;
  finished_at: string | null;
  id: CloudImportJobId | null;
  progress: number;
  started_at: string | null;
  state: CloudImportState;
}

export interface ActiveMigrationToken {
  created_at: string;
  created_by?: {
    email: string;
    name: string;
  };
  expires_at: string;
  id: MigrationTokenId;
  scope: MigrationScope;
  single_use: boolean;
}

export interface IssuedMigrationToken extends ActiveMigrationToken {
  import_job: CloudImportJob;
  token: string;
}

export interface MintMigrationTokenInput {
  scope?: MigrationScope;
}

export interface RevokedMigrationToken {
  id: MigrationTokenId;
  revoked_at: string;
}

export interface MigrationTokenListMeta extends ListMeta {
  import_job: CloudImportJob;
}

export interface MigrationTokenListResponse extends ListResponse<ActiveMigrationToken> {
  meta: MigrationTokenListMeta;
}

export type CloudImportSchemaVersion = 4;

export type CloudImportLocation =
  | "Australia"
  | "Austria"
  | "Belgium"
  | "Brazil"
  | "Canada"
  | "Denmark"
  | "Finland"
  | "France"
  | "Germany"
  | "India"
  | "Ireland"
  | "Italy"
  | "Japan"
  | "Mexico"
  | "Netherlands"
  | "New Zealand"
  | "Norway"
  | "Poland"
  | "Portugal"
  | "Singapore"
  | "South Africa"
  | "Spain"
  | "Sweden"
  | "Switzerland"
  | "United Arab Emirates"
  | "United Kingdom"
  | "United States";

export interface CloudImportCompatibility {
  app_version: string;
  latest_migration: string | null;
  schema_versions_supported: CloudImportSchemaVersion[];
}

export interface CloudImportRankingHistory {
  checkedAt: string;
  position?: number | null;
  previousPosition?: number | null;
  rankingUrl?: string | null;
}

export interface CloudImportKeyword {
  device: Device;
  id: KeywordId;
  keyword: string;
  location: CloudImportLocation;
  rankingHistory?: CloudImportRankingHistory[];
  tags?: string[];
  target_url?: string | null;
}

export interface CloudImportCompetitor {
  domain: string;
  id: CompetitorId;
  label?: string | null;
}

export interface CloudImportSavedView {
  config?: unknown;
  id: SavedViewId;
  name: string;
  surface?: "competitors" | "keywords";
}

export type CloudImportAlertChannel = "email" | "slack" | "webhook";

export type CloudImportAlertConditionType =
  | "change_pct"
  | "competitor_overtake"
  | "ctr_drop"
  | "downtrend"
  | "enters_top_n"
  | "exits_top_n"
  | "position_drop"
  | "serp_feature"
  | "threshold"
  | "url_mismatch";

export type CloudImportAlertTargetType = "all" | "keyword" | "tag";

export interface CloudImportKeywordAlertTarget {
  device?: Device;
  keyword?: string;
  keyword_id: KeywordId;
  location?: CloudImportLocation;
  type: "keyword";
}

export interface CloudImportTagAlertTarget {
  tag: string;
  type: "tag";
}

export type CloudImportAlertRuleTarget = CloudImportKeywordAlertTarget | CloudImportTagAlertTarget;

export interface CloudImportAlertRule {
  change_pct?: number | null;
  channels?: CloudImportAlertChannel[];
  competitor_domain?: string | null;
  condition_type?: CloudImportAlertConditionType;
  drop_positions?: number | null;
  enabled?: boolean;
  id: AlertRuleId;
  name: string;
  serp_feature?: string | null;
  target_type?: CloudImportAlertTargetType;
  targets?: CloudImportAlertRuleTarget[];
  threshold_position?: number | null;
  top_n?: number | null;
}

export interface CloudImportNotificationPreference {
  alert_email?: boolean;
  alert_in_app?: boolean;
  check_email?: boolean;
  check_in_app?: boolean;
  import_email?: boolean;
  import_in_app?: boolean;
  invite_email?: boolean;
  invite_in_app?: boolean;
  report_email?: boolean;
}

export type CloudImportScope = "current" | "history";

export interface CloudImportPackage {
  alert_rules: CloudImportAlertRule[];
  competitors: CloudImportCompetitor[];
  exported_at?: string;
  keywords: CloudImportKeyword[];
  notification_preferences: CloudImportNotificationPreference[];
  project_id: ProjectId;
  saved_views: CloudImportSavedView[];
  scope?: CloudImportScope;
  version: CloudImportSchemaVersion;
}

export type CloudImportCounts = Record<string, number>;

export interface CloudImportFinalizeResponse {
  counts: CloudImportCounts;
  job_id: CloudImportJobId;
  state: "done";
}

export interface CloudImportSessionCreate {
  chunk_count: number;
  source_project_id: ProjectId;
  totals?: {
    keywords?: number;
    rank_checks?: number;
  };
  version: CloudImportSchemaVersion;
}

export interface CloudImportSessionCreateResponse {
  chunk_limits: {
    max_body_bytes: number;
    max_history_rows: number;
    max_keywords: number;
  };
  session_id: CloudImportJobId;
  state: "receiving";
}

export interface CloudImportSourceKeyword {
  device: Device;
  location: CloudImportLocation;
  text: string;
}

export interface CloudImportSessionSections {
  alert_rules?: CloudImportAlertRule[];
  competitors?: CloudImportCompetitor[];
  notification_preferences?: CloudImportNotificationPreference[];
  saved_views?: CloudImportSavedView[];
  source_keyword_ids?: Partial<Record<KeywordId, CloudImportSourceKeyword>>;
}

export interface CloudImportKeywordsChunk {
  checksum: string;
  keywords: CloudImportKeyword[];
  kind: "keywords";
}

export interface CloudImportSectionsChunk {
  checksum: string;
  kind: "sections";
  sections: CloudImportSessionSections;
}

export type CloudImportUploadChunk = CloudImportKeywordsChunk | CloudImportSectionsChunk;

export interface UploadCloudImportChunkOptions extends RequestOptions {
  /** Set to "gzip" when the JSON chunk body is gzip compressed. */
  contentEncoding?: "gzip";
}

export interface CloudImportChunkResponse {
  chunk_count: number;
  chunks_received: number;
  state: "receiving";
}

export type SignalSource =
  | "api"
  | "cms"
  | "deploy"
  | "manual"
  | "rank_tracker"
  | "search_analytics"
  | "search_engine_status"
  | "sitemap"
  | "url_inspection";

export type CreateSignalSource = "api" | "cms" | "deploy";

export type SignalSeverity = "critical" | "info" | "warning";

export interface Signal {
  created_at: string;
  happened_at: string;
  id: SignalId;
  keyword_id: KeywordId | null;
  payload: JsonObject | null;
  project_id: ProjectId;
  public_id: SignalId;
  severity: SignalSeverity;
  source: SignalSource;
  type: string;
  url: string | null;
}

export interface CreateSignalInput {
  /** ISO-8601 date-time when the signal happened. Defaults to now on the server. */
  happened_at?: string;
  keyword_id?: KeywordId;
  /** JSON object payload. Ingestion rejects serialized payloads above 8KB. */
  payload?: JsonObject;
  severity?: SignalSeverity;
  source: CreateSignalSource;
  /** Dot-separated signal type such as "deploy.completed" (`^[a-z_]+\.[a-z_]+$`). */
  type: string;
  url?: string;
}

export interface ListSignalsOptions extends PaginationOptions {
  from?: Date | string;
  source?: SignalSource;
  to?: Date | string;
  type?: string;
}

export type CostEstimateFrequency = "daily" | "monthly" | "weekly";

export type PricingModel = "flat" | "plan";

export interface GetCostEstimateOptions {
  /** Device count per keyword (1 or 2). Defaults to 1. */
  devices?: number;
  /** Rank-check frequency used to estimate monthly checks. Defaults to "daily". */
  frequency?: CostEstimateFrequency;
  /** Keyword count. Required; integer between 0 and 100000. */
  keywords: number;
  /** Location count per keyword. Defaults to 1; maximum 100. */
  locations?: number;
  /** Flat-rate provider option key, for example "standard", "priority", or "live". */
  option?: string;
  /** Plan-model provider plan key; unknown values use auto selection. */
  plan?: string;
  /** Provider rate card to use. Defaults to "dataforseo". */
  provider?: string;
}

export interface ProviderRateOption {
  key: string;
  label: string;
  short_label: string;
  turnaround: string;
  unit_cost_cents: number;
  unit_cost_usd: number;
}

export interface ProviderRatePlan {
  included_checks: number;
  label: string;
  monthly_price_cents: number;
  monthly_price_usd: number;
  plan_key: string;
}

export interface ProviderRateBase {
  checked_at: string;
  label: string;
  notes?: string;
  provider_id: string;
  source_url: string;
}

export interface FlatProviderRate extends ProviderRateBase {
  options: ProviderRateOption[];
  pricing_model: "flat";
}

export interface PlanProviderRate extends ProviderRateBase {
  plans: ProviderRatePlan[];
  pricing_model: "plan";
}

export type ProviderRate = FlatProviderRate | PlanProviderRate;

export interface CostEstimateBase {
  checks_per_run: number;
  effective_cost_per_check_cents: number;
  exceeds_largest_plan: boolean;
  exceeds_selected_plan: boolean;
  monthly_checks: number;
  monthly_cost_cents: number;
  monthly_cost_usd: number;
  provider_id: string;
  rate_checked_at: string;
  rate_source_url: string;
}

export interface FlatCostEstimate extends CostEstimateBase {
  pricing_model: "flat";
  selected_option: ProviderRateOption;
}

export interface PlanCostEstimate extends CostEstimateBase {
  pricing_model: "plan";
  selected_plan: ProviderRatePlan;
}

export type CostEstimate = FlatCostEstimate | PlanCostEstimate;

export interface HealthResponse {
  checked_at: string;
  providers: {
    serp: string[];
  };
  services: {
    app: string;
    database: OpenString<"degraded" | "ok">;
  };
  status: OpenString<"degraded" | "ok">;
}

export interface Capability {
  description: string;
  input_schema: JsonObject;
  name: string;
  operationId: string;
}

export interface OpenApiDocument extends JsonObject {
  info: JsonObject;
  openapi: string;
  paths: JsonObject;
}

export interface RequestOptions {
  headers?: RequestHeaders;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. Null disables the timeout. */
  timeout?: number | null;
}

export interface BisibilityClientConfig {
  apiKey?: string;
  baseUrl?: string | URL;
  fetch?: FetchLike;
  headers?: RequestHeaders;
  /** Number of retries after the initial attempt. Defaults to 2; 0 disables retries. */
  maxRetries?: number;
  /**
   * Project public ID sent as the X-Bisibility-Project header on every request.
   * Targets personal access token requests at a project on routes without one in the path.
   */
  projectId?: ProjectId;
  /** Per-attempt timeout in milliseconds. Defaults to 30 seconds; null disables it. */
  timeout?: number | null;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
