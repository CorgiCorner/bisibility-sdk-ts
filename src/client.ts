import {
  BisibilityApiError,
  BisibilityConfigurationError,
  BisibilityNetworkError,
  BisibilityResponseError,
} from "./errors.js";
import { iterateCursorPagination } from "./pagination.js";
import { validatePublicIdRequest, validatePublicIdResponse } from "./public-id-contract.js";
import { isPublicIdOfType } from "./public-id.js";
import type {
  AddCompetitorInput,
  AlertId,
  AlertRule,
  AlertRuleId,
  AnalyzeBacklinksOptions,
  ApiKey,
  ApiKeyId,
  BacklinksSnapshot,
  BisibilityClientConfig,
  Capability,
  CloudImportChunkResponse,
  CloudImportCompatibility,
  CloudImportFinalizeResponse,
  CloudImportJobId,
  CloudImportPackage,
  CloudImportSessionCreate,
  CloudImportSessionCreateResponse,
  CloudImportUploadChunk,
  Competitor,
  CompetitorId,
  CompetitorListResponse,
  ConnectProviderInput,
  CostEstimate,
  CreateAlertRuleInput,
  CreateKeywordsInput,
  CreateKeywordsResponse,
  CreateMyTokenInput,
  CreateProjectInput,
  CreateSavedViewInput,
  CreateSignalInput,
  CreateTeamInviteInput,
  CreateWebhookInput,
  CreatedApiKey,
  CreatedPersonalAccessToken,
  CreatedTeamInvite,
  DataResponse,
  DeleteAlertRuleResponse,
  DeleteSavedViewResponse,
  ExportRankHistoryCsvOptions,
  ExportRankHistoryJsonOptions,
  FetchLike,
  GetCostEstimateOptions,
  GetKeywordMetricsInput,
  HealthResponse,
  InviteId,
  IssuedMigrationToken,
  Keyword,
  KeywordBulkInput,
  KeywordBulkResponse,
  KeywordId,
  KeywordMatchRequest,
  KeywordMatchResponse,
  KeywordMetricsResponse,
  KeywordResearchResponse,
  ListKeywordsOptions,
  ListRankChecksOptions,
  ListRankedKeywordSuggestionsOptions,
  ListResponse,
  ListSearchPerformanceQueryStatsOptions,
  ListSignalsOptions,
  ListTrafficSnapshotsOptions,
  LoadMoreBacklinkRowsOptions,
  LocationSuggestionsResponse,
  Me,
  MembershipId,
  MigrationTokenId,
  MigrationTokenListResponse,
  MintMigrationTokenInput,
  NotificationPreferences,
  OpenApiDocument,
  PageTrafficSnapshotsResponse,
  PaginationOptions,
  PersonalAccessToken,
  ProblemDetails,
  Project,
  ProjectDefaults,
  ProjectDefaultsPatch,
  ProjectId,
  ProjectOverview,
  ProjectOverviewOptions,
  Provider,
  ProviderConnection,
  ProviderDisconnectResponse,
  ProviderRate,
  ProviderSettingsInput,
  ProviderTestResult,
  RankCheck,
  RankCheckId,
  RankHistoryExportResponse,
  RankedKeywordSuggestionsResponse,
  RemoveCompetitorResponse,
  RequestOptions,
  ResearchKeywordsOptions,
  RevokedMigrationToken,
  RevokedTeamInvite,
  RunRankCheckInput,
  RunRankCheckOptions,
  SavedView,
  SavedViewId,
  SearchLocationsOptions,
  SearchPerformanceQueryStatsResponse,
  Signal,
  SitemapMonitor,
  SitemapMonitorListResponse,
  TeamInvite,
  TeamInviteResendResult,
  TeamMember,
  TeamMemberMutationResult,
  TeamMemberRoleResult,
  TestProviderConnectionInput,
  TrafficSyncSummary,
  TriggeredAlert,
  TriggeredAlertMuteResult,
  TriggeredAlertsReadResult,
  UpdateAlertRuleInput,
  UpdateKeywordInput,
  UpdateMeInput,
  UpdateNotificationPreferencesInput,
  UpdateProjectInput,
  UpdateSitemapMonitorInput,
  UpdateTeamMemberRoleInput,
  UpdateWebhookInput,
  UploadCloudImportChunkOptions,
  Webhook,
  WebhookId,
} from "./types.js";
import { SDK_VERSION } from "./version.js";

const DEFAULT_BASE_URL = "https://bisibility.com/api/v1";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 30_000;
const CLIENT_ID = `bisibility-sdk-ts/${SDK_VERSION}`;
const RELATIVE_BASE_ORIGIN = "https://bisibility.local";
const IDEMPOTENT_METHODS = new Set(["DELETE", "GET", "HEAD", "PUT"]);

type QueryScalar = boolean | Date | number | string | null | undefined;
type QueryValue = QueryScalar | readonly QueryScalar[];
type QueryParams = Record<string, QueryValue>;

interface InternalRequestOptions extends RequestOptions {
  auth?: boolean;
  body?: unknown;
  parseAs?: "json" | "text";
  query?: QueryParams;
}

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(value);
}

function normalizeBaseUrl(baseUrl: string | URL | undefined) {
  const raw = String(baseUrl ?? DEFAULT_BASE_URL).trim();
  if (!raw) {
    throw new BisibilityConfigurationError("baseUrl cannot be empty.");
  }

  let end = raw.length;
  while (end > 0 && raw[end - 1] === "/") {
    end -= 1;
  }
  return raw.slice(0, end);
}

function encodedPathSegment(value: string) {
  return encodeURIComponent(value);
}

function queryValue(value: QueryScalar) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value === null || value === undefined ? undefined : String(value);
}

function bodyOrUndefined(input: unknown) {
  return input && typeof input === "object" && Object.keys(input).length > 0 ? input : undefined;
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function problemFromJson(value: unknown): ProblemDetails | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  // Accept any RFC 9457 problem body. Some server responses (for example the
  // idempotency in-progress 409) omit docs_url and instance, so only the
  // identifying members are required.
  const candidate = value as Record<string, unknown>;
  const type = stringOrUndefined(candidate.type);
  const title = stringOrUndefined(candidate.title);
  const status = numberOrUndefined(candidate.status);
  if (type === undefined && (title === undefined || status === undefined)) {
    return undefined;
  }

  // Normalize known members to their expected types, dropping mismatched
  // values instead of passing the raw object through.
  const problem: Record<string, unknown> = { ...candidate };
  const normalized: Record<string, number | string | undefined> = {
    detail: stringOrUndefined(candidate.detail),
    docs_url: stringOrUndefined(candidate.docs_url),
    instance: stringOrUndefined(candidate.instance),
    status,
    title,
    type,
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) {
      delete problem[key];
    } else {
      problem[key] = value;
    }
  }

  return problem as ProblemDetails;
}

function composedSignal(signal: AbortSignal | undefined, timeout: number | null | undefined) {
  if (timeout === null || timeout === undefined) {
    return signal;
  }

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new BisibilityConfigurationError("timeout must be a positive finite number.");
  }
  if (typeof AbortSignal.timeout !== "function") {
    throw new BisibilityConfigurationError(
      "AbortSignal.timeout is not available in this runtime; omit timeout or use signal instead.",
    );
  }

  const timeoutSignal = AbortSignal.timeout(timeout);
  if (!signal) {
    return timeoutSignal;
  }

  const controller = new AbortController();
  for (const source of [signal, timeoutSignal]) {
    if (source.aborted) {
      controller.abort(source.reason);
      break;
    }
    source.addEventListener("abort", () => controller.abort(source.reason), { once: true });
  }

  return controller.signal;
}

function validatedMaxRetries(value: number | undefined) {
  const maxRetries = value ?? DEFAULT_MAX_RETRIES;
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new BisibilityConfigurationError("maxRetries must be a non-negative integer.");
  }
  return maxRetries;
}

function validatedTimeout(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return value;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new BisibilityConfigurationError("timeout must be a positive finite number or null.");
  }
  return value;
}

function retryBackoffMs(attempt: number) {
  return Math.min(500 * 2 ** attempt, 8_000);
}

function sleep(milliseconds: number, signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function sleepForRetry(
  milliseconds: number,
  signal: AbortSignal | undefined,
  method: string,
  url: string,
) {
  try {
    await sleep(milliseconds, signal);
  } catch (cause) {
    throw new BisibilityNetworkError("Network error while calling the Bisibility API.", {
      cause,
      method,
      url,
    });
  }
}

function mergeHeaders(first?: HeadersInit, second?: HeadersInit) {
  const headers = new Headers(first);
  if (second) {
    for (const [key, value] of new Headers(second)) {
      headers.set(key, value);
    }
  }

  return headers;
}

export class BisibilityClient {
  readonly #apiKey: string | undefined;
  readonly #defaultHeaders: HeadersInit | undefined;
  readonly #fetchImpl: FetchLike | undefined;
  readonly #maxRetries: number;
  readonly #projectId: ProjectId | undefined;
  readonly #timeout: number | null | undefined;
  readonly baseUrl: string;

  constructor(config: BisibilityClientConfig = {}) {
    if (config.projectId !== undefined && !isPublicIdOfType(config.projectId, "prj")) {
      throw new BisibilityConfigurationError("projectId must match prj_[a-z][a-z0-9]{23}.");
    }
    this.#apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.#defaultHeaders = config.headers;
    this.#fetchImpl = config.fetch;
    this.#maxRetries = validatedMaxRetries(config.maxRetries);
    this.#projectId = config.projectId;
    this.#timeout = validatedTimeout(config.timeout);
  }

  getHealth(options?: RequestOptions) {
    return this.request<HealthResponse>("GET", "/health", { ...options, auth: false });
  }

  getOpenApi(options?: RequestOptions) {
    return this.request<OpenApiDocument>("GET", "/openapi.json", { ...options, auth: false });
  }

  getCapabilities(options?: RequestOptions) {
    return this.request<DataResponse<Capability[]>>("GET", "/capabilities", {
      ...options,
      auth: false,
    });
  }

  getLlmsText(options?: RequestOptions) {
    return this.request<string>("GET", "/llms.txt", {
      ...options,
      auth: false,
      parseAs: "text",
    });
  }

  getProviderRates(options?: RequestOptions) {
    return this.request<DataResponse<ProviderRate[]>>("GET", "/provider-rates", {
      ...options,
      auth: false,
    });
  }

  getCostEstimate(input: GetCostEstimateOptions, options?: RequestOptions) {
    return this.request<DataResponse<CostEstimate>>("GET", "/cost-estimate", {
      ...options,
      auth: false,
      query: {
        devices: input.devices,
        frequency: input.frequency,
        keywords: input.keywords,
        locations: input.locations,
        option: input.option,
        plan: input.plan,
        provider: input.provider,
      },
    });
  }

  searchLocations(input: SearchLocationsOptions, options?: RequestOptions) {
    return this.request<LocationSuggestionsResponse>("GET", "/locations/search", {
      ...options,
      query: {
        country: input.country,
        limit: input.limit,
        q: input.q,
      },
    });
  }

  getMe(options?: RequestOptions) {
    return this.request<Me>("GET", "/me", options);
  }

  updateMe(input: UpdateMeInput, options?: RequestOptions) {
    return this.request<Me>("PATCH", "/me", { ...options, body: input });
  }

  listMyTokens(options?: RequestOptions) {
    return this.request<ListResponse<PersonalAccessToken>>("GET", "/me/tokens", options);
  }

  createMyToken(input: CreateMyTokenInput, options?: RequestOptions) {
    return this.request<CreatedPersonalAccessToken>("POST", "/me/tokens", {
      ...options,
      body: input,
    });
  }

  revokeMyToken(tokenId: PersonalAccessToken["id"] | "current", options?: RequestOptions) {
    return this.request<PersonalAccessToken>(
      "DELETE",
      `/me/tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  listProjects(options?: RequestOptions) {
    return this.request<ListResponse<Project>>("GET", "/projects", options);
  }

  createProject(input: CreateProjectInput, options?: RequestOptions) {
    return this.request<Project>("POST", "/projects", {
      ...options,
      body: input,
    });
  }

  getProject(projectId: ProjectId, options?: RequestOptions) {
    return this.request<Project>("GET", `/projects/${encodedPathSegment(projectId)}`, options);
  }

  updateProject(projectId: ProjectId, input: UpdateProjectInput, options?: RequestOptions) {
    return this.request<Project>("PATCH", `/projects/${encodedPathSegment(projectId)}`, {
      ...options,
      body: input,
    });
  }

  deleteProject(projectId: ProjectId, options?: RequestOptions) {
    return this.request<Project>("DELETE", `/projects/${encodedPathSegment(projectId)}`, options);
  }

  getProjectDefaults(projectId: ProjectId, options?: RequestOptions) {
    return this.request<ProjectDefaults>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/defaults`,
      options,
    );
  }

  getProjectOverview(
    projectId: ProjectId,
    options?: ProjectOverviewOptions,
    requestOptions?: RequestOptions,
  ) {
    const filters = options ?? {};

    return this.request<ProjectOverview>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/overview`,
      {
        ...requestOptions,
        query: {
          device: filters.device,
          range: filters.range,
          tag: filters.tag,
        },
      },
    );
  }

  matchProjectKeywords(
    projectId: ProjectId,
    input: KeywordMatchRequest,
    requestOptions?: RequestOptions,
  ) {
    return this.request<KeywordMatchResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/keyword-matches`,
      { ...requestOptions, body: input },
    );
  }

  updateProjectDefaults(
    projectId: ProjectId,
    input: ProjectDefaultsPatch,
    options?: RequestOptions,
  ) {
    return this.request<ProjectDefaults>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/defaults`,
      { ...options, body: input },
    );
  }

  listApiKeys(options?: PaginationOptions, requestOptions?: RequestOptions) {
    const pagination = options ?? {};

    return this.request<ListResponse<ApiKey>>("GET", "/api-keys", {
      ...requestOptions,
      query: {
        cursor: pagination.cursor,
        limit: pagination.limit,
      },
    });
  }

  iterateApiKeys(options: PaginationOptions = {}, requestOptions?: RequestOptions) {
    return iterateCursorPagination(
      (pageOptions) => this.listApiKeys(pageOptions, requestOptions),
      options,
    );
  }

  createApiKey(input: { name: string }, options?: RequestOptions) {
    return this.request<CreatedApiKey>("POST", "/api-keys", { ...options, body: input });
  }

  revokeApiKey(keyId: ApiKeyId, options?: RequestOptions) {
    return this.request<ApiKey>("DELETE", `/api-keys/${encodedPathSegment(keyId)}`, options);
  }

  listProjectApiKeys(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<ApiKey>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/api-keys`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateProjectApiKeys(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listProjectApiKeys(projectId, pageOptions, requestOptions),
      options,
    );
  }

  createProjectApiKey(projectId: ProjectId, input: { name: string }, options?: RequestOptions) {
    return this.request<CreatedApiKey>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/api-keys`,
      { ...options, body: input },
    );
  }

  listWebhooks(projectId: ProjectId, options?: PaginationOptions, requestOptions?: RequestOptions) {
    const pagination = options ?? {};

    return this.request<ListResponse<Webhook>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/webhooks`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateWebhooks(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listWebhooks(projectId, pageOptions, requestOptions),
      options,
    );
  }

  createWebhook(projectId: ProjectId, input: CreateWebhookInput, options?: RequestOptions) {
    return this.request<Webhook>("POST", `/projects/${encodedPathSegment(projectId)}/webhooks`, {
      ...options,
      body: input,
    });
  }

  updateWebhook(
    projectId: ProjectId,
    webhookId: WebhookId,
    input: UpdateWebhookInput,
    options?: RequestOptions,
  ) {
    return this.request<Webhook>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/webhooks/${encodedPathSegment(webhookId)}`,
      { ...options, body: input },
    );
  }

  deleteWebhook(projectId: ProjectId, webhookId: WebhookId, options?: RequestOptions) {
    return this.request<Webhook>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/webhooks/${encodedPathSegment(webhookId)}`,
      options,
    );
  }

  listKeywords(
    projectId: ProjectId,
    options?: ListKeywordsOptions,
    requestOptions?: RequestOptions,
  ) {
    const filters = options ?? {};

    return this.request<ListResponse<Keyword>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/keywords`,
      {
        ...requestOptions,
        query: {
          cursor: filters.cursor,
          "filter[country]": filters.country,
          "filter[device]": filters.device,
          "filter[intent]": filters.intent,
          "filter[position_gt]": filters.positionGt,
          "filter[position_lt]": filters.positionLt,
          "filter[tag]": filters.tag,
          "filter[topic]": filters.topic,
          limit: filters.limit,
          search: filters.search,
          sort: filters.sort,
        },
      },
    );
  }

  iterateKeywords(
    projectId: ProjectId,
    options: ListKeywordsOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listKeywords(projectId, pageOptions, requestOptions),
      options,
    );
  }

  addKeywords(projectId: ProjectId, input: CreateKeywordsInput, options?: RequestOptions) {
    return this.request<CreateKeywordsResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/keywords`,
      { ...options, body: input },
    );
  }

  getKeyword(keywordId: KeywordId, options?: RequestOptions) {
    return this.request<Keyword>("GET", `/keywords/${encodedPathSegment(keywordId)}`, options);
  }

  updateKeyword(keywordId: KeywordId, input: UpdateKeywordInput, options?: RequestOptions) {
    return this.request<Keyword>("PATCH", `/keywords/${encodedPathSegment(keywordId)}`, {
      ...options,
      body: input,
    });
  }

  setKeywordTargetUrl(keywordId: KeywordId, targetUrl: string | null, options?: RequestOptions) {
    return this.updateKeyword(keywordId, { target_url: targetUrl }, options);
  }

  deleteKeyword(keywordId: KeywordId, options?: RequestOptions) {
    return this.requestOrUndefined<Keyword>(
      "DELETE",
      `/keywords/${encodedPathSegment(keywordId)}`,
      options,
    );
  }

  bulkUpdateKeywords(input: KeywordBulkInput, options?: RequestOptions) {
    return this.request<KeywordBulkResponse>("POST", "/keywords/bulk", { ...options, body: input });
  }

  listRankedKeywordSuggestions(
    projectId: ProjectId,
    options?: ListRankedKeywordSuggestionsOptions,
    requestOptions?: RequestOptions,
  ) {
    const filters = options ?? {};

    return this.request<RankedKeywordSuggestionsResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/ranked-keyword-suggestions`,
      {
        ...requestOptions,
        query: {
          connection_id: filters.connectionId,
          fresh: filters.fresh,
          limit: filters.limit,
          offset: filters.offset,
        },
      },
    );
  }

  /**
   * Research keywords from one seed. This operation requires API write scope because a cache
   * miss can spend the project's provider budget. Use `estimateOnly` for a free dry run.
   */
  researchKeywords(
    projectId: ProjectId,
    options: ResearchKeywordsOptions,
    requestOptions?: RequestOptions,
  ) {
    return this.request<KeywordResearchResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/keyword-research`,
      {
        ...requestOptions,
        query: {
          connection_id: options.connectionId,
          estimate_only: options.estimateOnly,
          fresh: options.fresh,
          include_clickstream: options.includeClickstream,
          max_cost_cents: options.maxCostCents,
          mode: options.mode,
          result_limit: options.resultLimit,
          seed: options.seed,
        },
      },
    );
  }

  /**
   * Analyze backlinks. This operation requires API write scope because a cache miss can spend the
   * project's provider budget. Use `estimateOnly` (`estimate_only` on the wire) for a free dry
   * run.
   */
  analyzeBacklinks(
    projectId: ProjectId,
    options: AnalyzeBacklinksOptions,
    requestOptions?: RequestOptions,
  ) {
    return this.request<DataResponse<BacklinksSnapshot>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/backlinks`,
      {
        ...requestOptions,
        query: {
          target: options.target,
          target_scope: options.targetScope,
          include_subdomains: options.includeSubdomains,
          result_limit: options.resultLimit,
          mode: options.mode,
          estimate_only: options.estimateOnly,
          fresh: options.fresh,
          max_cost_cents: options.maxCostCents,
        },
      },
    );
  }

  /**
   * Load more rows into an unexpired backlinks snapshot. This operation requires API write scope
   * and spends provider budget.
   */
  loadMoreBacklinkRows(
    projectId: ProjectId,
    options: LoadMoreBacklinkRowsOptions,
    requestOptions?: RequestOptions,
  ) {
    return this.request<DataResponse<BacklinksSnapshot>>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/backlinks/rows`,
      {
        ...requestOptions,
        body: {
          target: options.target,
          target_scope: options.targetScope,
          include_subdomains: options.includeSubdomains,
          limit: options.limit,
        },
      },
    );
  }

  /**
   * Hydrate keyword metrics. This operation requires API write scope because cache misses can
   * spend the project's provider budget. Use `estimate_only` for a free dry run.
   */
  getKeywordMetrics(projectId: ProjectId, input: GetKeywordMetricsInput, options?: RequestOptions) {
    return this.request<KeywordMetricsResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/keyword-metrics`,
      { ...options, body: input },
    );
  }

  exportRankHistory(
    projectId: ProjectId,
    options: ExportRankHistoryCsvOptions,
    requestOptions?: RequestOptions,
  ): Promise<string>;
  exportRankHistory(
    projectId: ProjectId,
    options?: ExportRankHistoryJsonOptions,
    requestOptions?: RequestOptions,
  ): Promise<RankHistoryExportResponse>;
  exportRankHistory(
    projectId: ProjectId,
    options: ExportRankHistoryCsvOptions | ExportRankHistoryJsonOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<RankHistoryExportResponse | string> {
    return this.request<RankHistoryExportResponse | string>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/exports/rank-history`,
      {
        ...requestOptions,
        parseAs: options.format === "csv" ? "text" : "json",
        query: {
          cursor: "cursor" in options ? options.cursor : undefined,
          format: options.format,
          granularity: options.granularity,
          keyword_id: options.keywordIds,
          limit: "limit" in options ? options.limit : undefined,
          range: options.range,
        },
      },
    );
  }

  iterateRankHistoryExport(
    projectId: ProjectId,
    options: ExportRankHistoryJsonOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) =>
        this.exportRankHistory(
          projectId,
          { ...options, ...pageOptions, format: "json" },
          requestOptions,
        ),
      options,
    );
  }

  listSitemapMonitors(projectId: ProjectId, options?: RequestOptions) {
    return this.request<SitemapMonitorListResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/sitemap-monitors`,
      options,
    );
  }

  updateSitemapMonitor(
    projectId: ProjectId,
    monitorId: ProjectId,
    input: UpdateSitemapMonitorInput,
    options?: RequestOptions,
  ) {
    return this.request<SitemapMonitor>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/sitemap-monitors/${encodedPathSegment(monitorId)}`,
      { ...options, body: input },
    );
  }

  listRankChecks(
    keywordId: KeywordId,
    options?: ListRankChecksOptions,
    requestOptions?: RequestOptions,
  ) {
    const filters = options ?? {};

    return this.request<ListResponse<RankCheck>>(
      "GET",
      `/keywords/${encodedPathSegment(keywordId)}/rank-checks`,
      {
        ...requestOptions,
        query: {
          cursor: filters.cursor,
          limit: filters.limit,
          since: filters.since,
          status: filters.status,
          until: filters.until,
        },
      },
    );
  }

  iterateRankChecks(
    keywordId: KeywordId,
    options: ListRankChecksOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listRankChecks(keywordId, pageOptions, requestOptions),
      options,
    );
  }

  runRankCheck(keywordId: KeywordId, input?: RunRankCheckInput, options?: RunRankCheckOptions) {
    const { async: runAsync, ...requestOptions } = options ?? {};
    const body = input && Object.keys(input).length ? input : undefined;

    return this.request<RankCheck>("POST", `/keywords/${encodedPathSegment(keywordId)}/checks`, {
      ...requestOptions,
      body,
      ...(runAsync ? { query: { async: "true" } } : {}),
    });
  }

  getRankCheckResult(checkId: RankCheckId, options?: RequestOptions) {
    return this.request<RankCheck>("GET", `/rank-checks/${encodedPathSegment(checkId)}`, options);
  }

  createSignal(input: CreateSignalInput, options?: RequestOptions) {
    return this.request<Signal>("POST", "/signals", { ...options, body: input });
  }

  listSignals(projectId: ProjectId, options?: ListSignalsOptions, requestOptions?: RequestOptions) {
    const filters = options ?? {};

    return this.request<ListResponse<Signal>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/signals`,
      {
        ...requestOptions,
        query: {
          cursor: filters.cursor,
          from: filters.from,
          limit: filters.limit,
          source: filters.source,
          to: filters.to,
          type: filters.type,
        },
      },
    );
  }

  iterateSignals(
    projectId: ProjectId,
    options: ListSignalsOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listSignals(projectId, pageOptions, requestOptions),
      options,
    );
  }

  listTrafficSnapshots(
    projectId: ProjectId,
    options: ListTrafficSnapshotsOptions,
    requestOptions?: RequestOptions,
  ) {
    return this.request<PageTrafficSnapshotsResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/analytics/traffic-snapshots`,
      {
        ...requestOptions,
        query: {
          end_date: options.endDate,
          limit: options.limit,
          offset: options.offset,
          path: options.paths,
          start_date: options.startDate,
        },
      },
    );
  }

  listSearchPerformanceQueryStats(
    projectId: ProjectId,
    options: ListSearchPerformanceQueryStatsOptions,
    requestOptions?: RequestOptions,
  ) {
    return this.request<SearchPerformanceQueryStatsResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/analytics/query-stats`,
      {
        ...requestOptions,
        query: {
          connection_id: options.connectionId,
          end_date: options.endDate,
          limit: options.limit,
          query: options.query,
          start_date: options.startDate,
        },
      },
    );
  }

  syncProjectTraffic(projectId: ProjectId, options?: RequestOptions) {
    return this.request<TrafficSyncSummary>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/analytics/sync`,
      options,
    );
  }

  listAlertRules(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<AlertRule>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/alert-rules`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateAlertRules(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listAlertRules(projectId, pageOptions, requestOptions),
      options,
    );
  }

  createAlertRule(projectId: ProjectId, input: CreateAlertRuleInput, options?: RequestOptions) {
    return this.request<AlertRule>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/alert-rules`,
      { ...options, body: input },
    );
  }

  updateAlertRule(ruleId: AlertRuleId, input: UpdateAlertRuleInput, options?: RequestOptions) {
    return this.request<AlertRule>("PATCH", `/alert-rules/${encodedPathSegment(ruleId)}`, {
      ...options,
      body: input,
    });
  }

  deleteAlertRule(ruleId: AlertRuleId, options?: RequestOptions) {
    return this.request<DeleteAlertRuleResponse>(
      "DELETE",
      `/alert-rules/${encodedPathSegment(ruleId)}`,
      options,
    );
  }

  listTriggeredAlerts(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<TriggeredAlert>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/triggered-alerts`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateTriggeredAlerts(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listTriggeredAlerts(projectId, pageOptions, requestOptions),
      options,
    );
  }

  muteTriggeredAlert(projectId: ProjectId, alertId: AlertId, options?: RequestOptions) {
    return this.request<TriggeredAlertMuteResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/triggered-alerts/${encodedPathSegment(alertId)}/mute`,
      options,
    );
  }

  markProjectAlertsRead(projectId: ProjectId, options?: RequestOptions) {
    return this.request<TriggeredAlertsReadResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/triggered-alerts/mark-read`,
      options,
    );
  }

  listTeamMembers(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<TeamMember>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/team/members`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateTeamMembers(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listTeamMembers(projectId, pageOptions, requestOptions),
      options,
    );
  }

  listTeamInvites(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<TeamInvite>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/team/invites`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateTeamInvites(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listTeamInvites(projectId, pageOptions, requestOptions),
      options,
    );
  }

  createTeamInvite(projectId: ProjectId, input: CreateTeamInviteInput, options?: RequestOptions) {
    return this.request<CreatedTeamInvite>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/team/invites`,
      { ...options, body: input },
    );
  }

  revokeTeamInvite(projectId: ProjectId, inviteId: InviteId, options?: RequestOptions) {
    return this.request<RevokedTeamInvite>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/team/invites/${encodedPathSegment(inviteId)}`,
      options,
    );
  }

  revokeTeamInviteById(inviteId: InviteId, options?: RequestOptions) {
    return this.request<RevokedTeamInvite>(
      "DELETE",
      `/team/invites/${encodedPathSegment(inviteId)}`,
      options,
    );
  }

  resendTeamInvite(projectId: ProjectId, inviteId: InviteId, options?: RequestOptions) {
    return this.request<TeamInviteResendResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/team/invites/${encodedPathSegment(inviteId)}/resend`,
      options,
    );
  }

  updateTeamMemberRole(
    projectId: ProjectId,
    memberId: MembershipId,
    input: UpdateTeamMemberRoleInput,
    options?: RequestOptions,
  ) {
    return this.request<TeamMemberRoleResult>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/team/members/${encodedPathSegment(memberId)}`,
      { ...options, body: input },
    );
  }

  removeTeamMember(projectId: ProjectId, memberId: MembershipId, options?: RequestOptions) {
    return this.request<TeamMemberMutationResult>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/team/members/${encodedPathSegment(memberId)}`,
      options,
    );
  }

  listProviders(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<Provider>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/providers`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateProviders(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listProviders(projectId, pageOptions, requestOptions),
      options,
    );
  }

  connectProvider(
    projectId: ProjectId,
    providerId: string,
    input: ConnectProviderInput = {},
    options?: RequestOptions,
  ) {
    return this.request<ProviderConnection>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/providers/${encodedPathSegment(
        providerId,
      )}/connect`,
      { ...options, body: bodyOrUndefined(input) },
    );
  }

  testProviderConnection(
    projectId: ProjectId,
    providerId: string,
    input: TestProviderConnectionInput = {},
    options?: RequestOptions,
  ) {
    return this.request<ProviderTestResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/providers/${encodedPathSegment(providerId)}/test`,
      { ...options, body: bodyOrUndefined(input) },
    );
  }

  updateProviderSettings(
    projectId: ProjectId,
    providerId: string,
    input: ProviderSettingsInput,
    options?: RequestOptions,
  ) {
    return this.request<ProviderConnection>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/providers/${encodedPathSegment(providerId)}`,
      { ...options, body: input },
    );
  }

  setProviderEnabled(
    projectId: ProjectId,
    providerId: string,
    enabled: boolean,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { enabled }, options);
  }

  enableProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.setProviderEnabled(projectId, providerId, true, options);
  }

  disableProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.setProviderEnabled(projectId, providerId, false, options);
  }

  setProviderPriority(
    projectId: ProjectId,
    providerId: string,
    priority: number,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { priority }, options);
  }

  setPrimaryProvider(
    projectId: ProjectId,
    providerId: string,
    primary = true,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { primary }, options);
  }

  disconnectProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.request<ProviderDisconnectResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/providers/${encodedPathSegment(providerId)}`,
      options,
    );
  }

  listSavedViews(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<SavedView>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/saved-views`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateSavedViews(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listSavedViews(projectId, pageOptions, requestOptions),
      options,
    );
  }

  createSavedView(projectId: ProjectId, input: CreateSavedViewInput, options?: RequestOptions) {
    return this.request<SavedView>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/saved-views`,
      { ...options, body: input },
    );
  }

  deleteSavedView(projectId: ProjectId, viewId: SavedViewId, options?: RequestOptions) {
    return this.request<DeleteSavedViewResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/saved-views/${encodedPathSegment(viewId)}`,
      options,
    );
  }

  deleteSavedViewById(viewId: SavedViewId, options?: RequestOptions) {
    return this.request<DeleteSavedViewResponse>(
      "DELETE",
      `/saved-views/${encodedPathSegment(viewId)}`,
      options,
    );
  }

  listCompetitors(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<CompetitorListResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/competitors`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateCompetitors(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listCompetitors(projectId, pageOptions, requestOptions),
      options,
    );
  }

  addCompetitor(projectId: ProjectId, input: AddCompetitorInput, options?: RequestOptions) {
    return this.request<Competitor>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/competitors`,
      { ...options, body: input },
    );
  }

  removeCompetitor(projectId: ProjectId, competitorId: CompetitorId, options?: RequestOptions) {
    return this.request<RemoveCompetitorResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/competitors/${encodedPathSegment(competitorId)}`,
      options,
    );
  }

  removeCompetitorById(competitorId: CompetitorId, options?: RequestOptions) {
    return this.request<RemoveCompetitorResponse>(
      "DELETE",
      `/competitors/${encodedPathSegment(competitorId)}`,
      options,
    );
  }

  getNotificationPreferences(projectId: ProjectId, options?: RequestOptions) {
    return this.request<NotificationPreferences>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/notification-preferences`,
      options,
    );
  }

  updateNotificationPreferences(
    projectId: ProjectId,
    input: UpdateNotificationPreferencesInput,
    options?: RequestOptions,
  ) {
    return this.request<NotificationPreferences>(
      "PATCH",
      `/projects/${encodedPathSegment(projectId)}/notification-preferences`,
      { ...options, body: input },
    );
  }

  listMigrationTokens(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<MigrationTokenListResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/migration-tokens`,
      {
        ...requestOptions,
        query: {
          cursor: pagination.cursor,
          limit: pagination.limit,
        },
      },
    );
  }

  iterateMigrationTokens(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listMigrationTokens(projectId, pageOptions, requestOptions),
      options,
    );
  }

  mintMigrationToken(
    projectId: ProjectId,
    input: MintMigrationTokenInput = {},
    options?: RequestOptions,
  ) {
    return this.request<IssuedMigrationToken>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/migration-tokens`,
      { ...options, body: bodyOrUndefined(input) },
    );
  }

  revokeMigrationToken(projectId: ProjectId, tokenId: MigrationTokenId, options?: RequestOptions) {
    return this.request<RevokedMigrationToken>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/migration-tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  revokeMigrationTokenById(tokenId: MigrationTokenId, options?: RequestOptions) {
    return this.request<RevokedMigrationToken>(
      "DELETE",
      `/migration-tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  getCloudImportCompatibility(options?: RequestOptions) {
    return this.request<CloudImportCompatibility>("GET", "/cloud/import/compatibility", {
      ...options,
      auth: false,
    });
  }

  importCloudExport(input: CloudImportPackage, options?: RequestOptions) {
    return this.request<CloudImportFinalizeResponse>("POST", "/cloud/import", {
      ...options,
      body: input,
    });
  }

  createCloudImportSession(input: CloudImportSessionCreate, options?: RequestOptions) {
    return this.request<CloudImportSessionCreateResponse>("POST", "/cloud/import/sessions", {
      ...options,
      body: input,
    });
  }

  uploadCloudImportChunk(
    sessionId: CloudImportJobId,
    index: number,
    input: CloudImportUploadChunk,
    options?: UploadCloudImportChunkOptions,
  ) {
    const { contentEncoding, headers, ...requestOptions } = options ?? {};
    const mergedHeaders = new Headers(headers);
    if (contentEncoding !== undefined) {
      mergedHeaders.set("Content-Encoding", contentEncoding);
    }

    return this.request<CloudImportChunkResponse>(
      "PUT",
      `/cloud/import/sessions/${encodedPathSegment(sessionId)}/chunks/${encodedPathSegment(String(index))}`,
      { ...requestOptions, body: input, headers: mergedHeaders },
    );
  }

  finalizeCloudImportSession(sessionId: CloudImportJobId, options?: RequestOptions) {
    return this.request<CloudImportFinalizeResponse>(
      "POST",
      `/cloud/import/sessions/${encodedPathSegment(sessionId)}/finalize`,
      options,
    );
  }

  private buildUrl(path: string, query?: QueryParams) {
    const absolute = isAbsoluteUrl(this.baseUrl);
    const base = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const url = new URL(base, absolute ? undefined : RELATIVE_BASE_ORIGIN);

    if (query) {
      for (const [key, rawValue] of Object.entries(query)) {
        const rawValues: readonly QueryScalar[] = Array.isArray(rawValue)
          ? rawValue
          : [rawValue as QueryScalar];
        for (const rawItem of rawValues) {
          const value = queryValue(rawItem);
          if (value !== undefined) {
            url.searchParams.append(key, value);
          }
        }
      }
    }

    return absolute ? url.toString() : `${url.pathname}${url.search}`;
  }

  private async request<T>(method: string, path: string, options: InternalRequestOptions = {}) {
    const statusRef: { status: number } = { status: 0 };
    const result = await this.requestOrUndefined<T>(method, path, options, statusRef);
    if (result === undefined) {
      throw new BisibilityResponseError("Bisibility API returned an empty response body.", {
        body: "",
        cause: undefined,
        method,
        status: statusRef.status,
        url: this.buildUrl(path, options.query),
      });
    }
    return result;
  }

  private async requestOrUndefined<T>(
    method: string,
    path: string,
    options: InternalRequestOptions = {},
    statusRef?: { status: number },
  ): Promise<T | undefined> {
    try {
      validatePublicIdRequest(path, { body: options.body, query: options.query });
    } catch (cause) {
      throw new BisibilityConfigurationError(
        cause instanceof Error ? cause.message : "Invalid public ID request contract.",
      );
    }

    const fetchImpl = this.#fetchImpl ?? globalThis.fetch;
    const url = this.buildUrl(path, options.query);
    if (!fetchImpl) {
      throw new BisibilityConfigurationError(
        "No fetch implementation is available. Pass fetch in BisibilityClient config.",
      );
    }
    if (options.auth !== false && !this.#apiKey) {
      throw new BisibilityConfigurationError("apiKey is required for this Bisibility API method.");
    }

    const headers = mergeHeaders(this.#defaultHeaders, options.headers);
    if (this.#projectId !== undefined && !headers.has("X-Bisibility-Project")) {
      headers.set("X-Bisibility-Project", this.#projectId);
    }
    const projectHeader = headers.get("X-Bisibility-Project");
    if (projectHeader !== null && !isPublicIdOfType(projectHeader, "prj")) {
      throw new BisibilityConfigurationError(
        "X-Bisibility-Project must match prj_[a-z][a-z0-9]{23}.",
      );
    }
    if (options.auth !== false) {
      headers.set("Authorization", `Bearer ${this.#apiKey}`);
    }
    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    headers.set("X-Bisibility-Client", CLIENT_ID);
    if (!headers.has("User-Agent")) {
      try {
        headers.set("User-Agent", CLIENT_ID);
      } catch {
        // Browsers may forbid setting User-Agent. X-Bisibility-Client remains authoritative.
      }
    }

    const baseInit: RequestInit = { headers, method, redirect: "error" };

    if (options.body !== undefined) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      baseInit.body = JSON.stringify(options.body);
    }

    const timeout =
      options.timeout !== undefined
        ? validatedTimeout(options.timeout)
        : this.#timeout !== undefined
          ? this.#timeout
          : options.signal
            ? null
            : DEFAULT_TIMEOUT;
    const retryable =
      IDEMPOTENT_METHODS.has(method.toUpperCase()) || headers.has("Idempotency-Key");

    for (let attempt = 0; ; attempt += 1) {
      const init: RequestInit = { ...baseInit };
      const signal = composedSignal(options.signal, timeout);
      if (signal) {
        init.signal = signal;
      }

      let response: Response;
      try {
        response = await fetchImpl(url, init);
      } catch (cause) {
        if (!retryable || attempt >= this.#maxRetries || options.signal?.aborted) {
          throw new BisibilityNetworkError("Network error while calling the Bisibility API.", {
            cause,
            method,
            url,
          });
        }
        await sleepForRetry(retryBackoffMs(attempt), options.signal, method, url);
        continue;
      }

      if (!response.ok) {
        const error = await this.errorFromResponse(response, method, url);
        if (
          retryable &&
          attempt < this.#maxRetries &&
          (error.status === 429 || error.status === 503)
        ) {
          await sleepForRetry(
            error.retryAfterSeconds === null
              ? retryBackoffMs(attempt)
              : error.retryAfterSeconds * 1_000,
            options.signal,
            method,
            url,
          );
          continue;
        }
        throw error;
      }

      if (statusRef) {
        statusRef.status = response.status;
      }

      if (options.parseAs === "text") {
        return response.text() as Promise<T>;
      }

      return this.jsonFromResponse<T>(response, method, url, path);
    }
  }

  private async jsonFromResponse<T>(
    response: Response,
    method: string,
    url: string,
    path: string,
  ): Promise<T | undefined> {
    const body = await response.text();
    if (!body) {
      return undefined;
    }

    let parsed: T;
    try {
      parsed = JSON.parse(body) as T;
    } catch (error) {
      throw new BisibilityResponseError("Bisibility API returned invalid JSON.", {
        body,
        cause: error,
        method,
        status: response.status,
        url,
      });
    }

    try {
      validatePublicIdResponse(path, parsed, method);
    } catch (cause) {
      throw new BisibilityResponseError(
        "Bisibility API returned an invalid public ID response contract.",
        {
          body,
          cause,
          method,
          status: response.status,
          url,
        },
      );
    }

    return parsed;
  }

  private async errorFromResponse(response: Response, method: string, url: string) {
    const headers = new Headers(response.headers);
    const body = await response.text();
    const contentType = headers.get("Content-Type") ?? "";
    let parsed: unknown;

    if (body && contentType.includes("json")) {
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = undefined;
      }
    }

    const problem = problemFromJson(parsed);
    const message =
      problem?.detail || body || `Bisibility API request failed with status ${response.status}.`;

    return new BisibilityApiError(message, {
      body,
      headers,
      method,
      problem,
      status: response.status,
      url,
    });
  }
}

export function createBisibilityClient(config: BisibilityClientConfig = {}) {
  return new BisibilityClient(config);
}
