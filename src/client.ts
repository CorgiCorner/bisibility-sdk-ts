import {
  BISIBILITY_API_VERSION,
  BISIBILITY_API_VERSION_HEADER,
  UNSUPPORTED_API_VERSION_PROBLEM_TYPE,
} from "./api-version.js";
import {
  BisibilityApiError,
  BisibilityApiVersionError,
  BisibilityConfigurationError,
  BisibilityNetworkError,
  BisibilityResponseError,
  isUnsupportedApiVersionProblem,
} from "./errors.js";
import { iterateCursorPagination } from "./pagination.js";
import { validatePublicIdRequest, validatePublicIdResponse } from "./public-id-contract.js";
import { isPublicIdOfType } from "./public-id.js";
import { type ClientResourceNamespaces, installResourceNamespaces } from "./resources.js";
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
  CapabilitiesResponse,
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
  CreateApiKeyInput,
  CreateKeywordsInput,
  CreateKeywordsResponse,
  CreateMyTokenInput,
  CreateProjectInput,
  CreateSavedKeywordsInput,
  CreateSavedKeywordsResponse,
  CreateSavedViewInput,
  CreateSignalInput,
  CreateTeamInviteInput,
  CreateWebhookInput,
  CreatedApiKey,
  CreatedPersonalAccessToken,
  CreatedTeamInvite,
  DataResponse,
  DeleteAlertRuleResponse,
  DeleteSavedKeywordResponse,
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
  ListSavedViewsOptions,
  ListSearchPerformanceQueryStatsOptions,
  ListSignalsOptions,
  ListTrafficSnapshotsOptions,
  LivenessResponse,
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
  ReadinessResponse,
  RemoveCompetitorResponse,
  RequestOptions,
  ResearchKeywordsOptions,
  RevokedMigrationToken,
  RevokedTeamInvite,
  RunRankCheckInput,
  RunRankCheckOptions,
  SavedKeyword,
  SavedKeywordId,
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
  acceptedStatuses?: readonly number[];
  auth?: boolean;
  body?: unknown;
  parseAs?: "json" | "text";
  query?: QueryParams;
  skipApiVersionPreflight?: boolean;
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

function apiVersionErrorDetails(problem: ProblemDetails | undefined) {
  if (!problem?.errors || typeof problem.errors !== "object") {
    return {
      declaredApiVersion: BISIBILITY_API_VERSION,
      serverApiVersions: [] as string[],
    };
  }

  const errors = problem.errors as Record<string, unknown>;
  const serverApiVersions = Array.isArray(errors.apiVersions)
    ? errors.apiVersions.filter((version): version is string => typeof version === "string")
    : [];
  return {
    declaredApiVersion:
      typeof errors.declaredApiVersion === "string"
        ? errors.declaredApiVersion
        : BISIBILITY_API_VERSION,
    serverApiVersions,
  };
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

const AUTH_TOKEN_PREFIXES = ["bsb_key_live_", "bsb_key_test_", "bsb_pat_live_", "mig_"] as const;

function validateCredential(value: string | undefined) {
  if (value !== undefined && !AUTH_TOKEN_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    throw new BisibilityConfigurationError(
      "apiKey must use a current bsb_key_live_, bsb_key_test_, bsb_pat_live_, or mig_ prefix.",
    );
  }
}

export class BisibilityClient {
  #apiVersionPreflight: Promise<void> | undefined;
  readonly #apiKey: string | undefined;
  readonly #defaultHeaders: HeadersInit | undefined;
  readonly #fetchImpl: FetchLike | undefined;
  readonly #maxRetries: number;
  readonly #projectId: ProjectId | undefined;
  readonly #timeout: number | null | undefined;
  declare readonly account: ClientResourceNamespaces["account"];
  declare readonly alertRules: ClientResourceNamespaces["alertRules"];
  declare readonly alerts: ClientResourceNamespaces["alerts"];
  declare readonly analytics: ClientResourceNamespaces["analytics"];
  declare readonly apiKeys: ClientResourceNamespaces["apiKeys"];
  declare readonly backlinks: ClientResourceNamespaces["backlinks"];
  readonly baseUrl: string;
  declare readonly competitors: ClientResourceNamespaces["competitors"];
  declare readonly imports: ClientResourceNamespaces["imports"];
  declare readonly keywords: ClientResourceNamespaces["keywords"];
  declare readonly locations: ClientResourceNamespaces["locations"];
  declare readonly notificationSettings: ClientResourceNamespaces["notificationSettings"];
  declare readonly pricing: ClientResourceNamespaces["pricing"];
  declare readonly projects: ClientResourceNamespaces["projects"];
  declare readonly providers: ClientResourceNamespaces["providers"];
  declare readonly rankChecks: ClientResourceNamespaces["rankChecks"];
  declare readonly savedViews: ClientResourceNamespaces["savedViews"];
  declare readonly signals: ClientResourceNamespaces["signals"];
  declare readonly sitemapMonitors: ClientResourceNamespaces["sitemapMonitors"];
  declare readonly system: ClientResourceNamespaces["system"];
  declare readonly team: ClientResourceNamespaces["team"];
  declare readonly webhooks: ClientResourceNamespaces["webhooks"];

  constructor(config: BisibilityClientConfig = {}) {
    if (config.projectId !== undefined && !isPublicIdOfType(config.projectId, "prj")) {
      throw new BisibilityConfigurationError("projectId must match prj_[a-z][a-z0-9]{23}.");
    }
    validateCredential(config.apiKey);
    this.#apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.#defaultHeaders = config.headers;
    this.#fetchImpl = config.fetch;
    this.#maxRetries = validatedMaxRetries(config.maxRetries);
    this.#projectId = config.projectId;
    this.#timeout = validatedTimeout(config.timeout);
    installResourceNamespaces(this);
  }

  /** @deprecated Use `client.system.getHealth()`. */
  getHealth(options?: RequestOptions) {
    return this.request<HealthResponse>("GET", "/health", {
      ...options,
      acceptedStatuses: [503],
      auth: false,
    });
  }

  /** @deprecated Use `client.system.getLiveness()`. */
  getLiveness(options?: RequestOptions) {
    return this.request<LivenessResponse>("GET", "/liveness", { ...options, auth: false });
  }

  /** @deprecated Use `client.system.getReadiness()`. */
  getReadiness(options?: RequestOptions) {
    return this.request<ReadinessResponse>("GET", "/readiness", {
      ...options,
      acceptedStatuses: [503],
      auth: false,
    });
  }

  /** @deprecated Use `client.system.getOpenApi()`. */
  getOpenApi(options?: RequestOptions) {
    return this.request<OpenApiDocument>("GET", "/openapi.json", { ...options, auth: false });
  }

  /** @deprecated Use `client.system.getCapabilities()`. */
  async getCapabilities(options?: RequestOptions) {
    const response = await this.request<CapabilitiesResponse>("GET", "/capabilities", {
      ...options,
      auth: false,
      skipApiVersionPreflight: true,
    });
    this.assertApiVersionCompatible(response);
    this.#apiVersionPreflight ??= Promise.resolve();
    return response;
  }

  /** @deprecated Use `client.system.getLlmsText()`. */
  getLlmsText(options?: RequestOptions) {
    return this.request<string>("GET", "/llms.txt", {
      ...options,
      auth: false,
      parseAs: "text",
    });
  }

  /** @deprecated Use `client.pricing.getRates()`. */
  getProviderRates(options?: RequestOptions) {
    return this.request<DataResponse<ProviderRate[]>>("GET", "/provider-rates", {
      ...options,
      auth: false,
    });
  }

  /** @deprecated Use `client.pricing.estimate()`. */
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

  /** @deprecated Use `client.locations.search()`. */
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

  /** @deprecated Use `client.account.get()`. */
  getMe(options?: RequestOptions) {
    return this.request<Me>("GET", "/me", options);
  }

  /** @deprecated Use `client.account.update()`. */
  updateMe(input: UpdateMeInput, options?: RequestOptions) {
    return this.request<Me>("PATCH", "/me", { ...options, body: input });
  }

  /** @deprecated Use `client.account.tokens.list()`. */
  listMyTokens(options?: RequestOptions) {
    return this.request<ListResponse<PersonalAccessToken>>("GET", "/me/tokens", options);
  }

  /** @deprecated Use `client.account.tokens.create()`. */
  createMyToken(input: CreateMyTokenInput, options?: RequestOptions) {
    return this.request<CreatedPersonalAccessToken>("POST", "/me/tokens", {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.account.tokens.revoke()`. */
  revokeMyToken(tokenId: PersonalAccessToken["id"] | "current", options?: RequestOptions) {
    return this.request<PersonalAccessToken>(
      "DELETE",
      `/me/tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  /** @deprecated Use `client.projects.list()`. */
  listProjects(options?: RequestOptions) {
    return this.request<ListResponse<Project>>("GET", "/projects", options);
  }

  /** @deprecated Use `client.projects.create()`. */
  createProject(input: CreateProjectInput, options?: RequestOptions) {
    return this.request<Project>("POST", "/projects", {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.projects.get()`. */
  getProject(projectId: ProjectId, options?: RequestOptions) {
    return this.request<Project>("GET", `/projects/${encodedPathSegment(projectId)}`, options);
  }

  /** @deprecated Use `client.projects.update()`. */
  updateProject(projectId: ProjectId, input: UpdateProjectInput, options?: RequestOptions) {
    return this.request<Project>("PATCH", `/projects/${encodedPathSegment(projectId)}`, {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.projects.delete()`. */
  deleteProject(projectId: ProjectId, options?: RequestOptions) {
    return this.request<Project>("DELETE", `/projects/${encodedPathSegment(projectId)}`, options);
  }

  /** @deprecated Use `client.projects.getDefaults()`. */
  getProjectDefaults(projectId: ProjectId, options?: RequestOptions) {
    return this.request<ProjectDefaults>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/defaults`,
      options,
    );
  }

  /** @deprecated Use `client.analytics.overview.get()`. */
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

  /** @deprecated Use `client.keywords.match()`. */
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

  /** @deprecated Use `client.projects.updateDefaults()`. */
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

  /** @deprecated Use `client.apiKeys.list()`. */
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

  /** @deprecated Use `client.apiKeys.iterate()`. */
  iterateApiKeys(options: PaginationOptions = {}, requestOptions?: RequestOptions) {
    return iterateCursorPagination(
      (pageOptions) => this.listApiKeys(pageOptions, requestOptions),
      options,
    );
  }

  /** @deprecated Use `client.apiKeys.create()`. */
  createApiKey(input: CreateApiKeyInput, options?: RequestOptions) {
    return this.request<CreatedApiKey>("POST", "/api-keys", { ...options, body: input });
  }

  /** @deprecated Use `client.apiKeys.revoke()`. */
  revokeApiKey(keyId: ApiKeyId, options?: RequestOptions) {
    return this.request<ApiKey>("DELETE", `/api-keys/${encodedPathSegment(keyId)}`, options);
  }

  /** @deprecated Use `client.apiKeys.list({ projectId })`. */
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

  /** @deprecated Use `client.apiKeys.iterate({ projectId })`. */
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

  /** @deprecated Use `client.apiKeys.create(input, { projectId })`. */
  createProjectApiKey(projectId: ProjectId, input: CreateApiKeyInput, options?: RequestOptions) {
    return this.request<CreatedApiKey>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/api-keys`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.webhooks.list()`. */
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

  /** @deprecated Use `client.webhooks.iterate()`. */
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

  /** @deprecated Use `client.webhooks.create()`. */
  createWebhook(projectId: ProjectId, input: CreateWebhookInput, options?: RequestOptions) {
    return this.request<Webhook>("POST", `/projects/${encodedPathSegment(projectId)}/webhooks`, {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.webhooks.update()`. */
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

  /** @deprecated Use `client.webhooks.delete()`. */
  deleteWebhook(projectId: ProjectId, webhookId: WebhookId, options?: RequestOptions) {
    return this.request<Webhook>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/webhooks/${encodedPathSegment(webhookId)}`,
      options,
    );
  }

  /** @deprecated Use `client.keywords.list()`. */
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

  /** @deprecated Use `client.keywords.iterate()`. */
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

  /** @deprecated Use `client.keywords.add()`. */
  addKeywords(projectId: ProjectId, input: CreateKeywordsInput, options?: RequestOptions) {
    return this.request<CreateKeywordsResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/keywords`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.keywords.get()`. */
  getKeyword(keywordId: KeywordId, options?: RequestOptions) {
    return this.request<Keyword>("GET", `/keywords/${encodedPathSegment(keywordId)}`, options);
  }

  /** @deprecated Use `client.keywords.update()`. */
  updateKeyword(keywordId: KeywordId, input: UpdateKeywordInput, options?: RequestOptions) {
    return this.request<Keyword>("PATCH", `/keywords/${encodedPathSegment(keywordId)}`, {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.keywords.setTargetUrl()`. */
  setKeywordTargetUrl(keywordId: KeywordId, targetUrl: string | null, options?: RequestOptions) {
    return this.updateKeyword(keywordId, { target_url: targetUrl }, options);
  }

  /** @deprecated Use `client.keywords.delete()`. */
  deleteKeyword(keywordId: KeywordId, options?: RequestOptions) {
    return this.requestOrUndefined<Keyword>(
      "DELETE",
      `/keywords/${encodedPathSegment(keywordId)}`,
      options,
    );
  }

  /** @deprecated Use `client.keywords.bulkUpdate()`. */
  bulkUpdateKeywords(input: KeywordBulkInput, options?: RequestOptions) {
    return this.request<KeywordBulkResponse>("POST", "/keywords/bulk", { ...options, body: input });
  }

  /** @deprecated Use `client.keywords.suggestions.list()`. */
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
   * @deprecated Use `client.keywords.research()`.
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
   * @deprecated Use `client.backlinks.analyze()`.
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
   * @deprecated Use `client.backlinks.extendSnapshot()`.
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
   * @deprecated Use `client.keywords.metrics.get()`.
   */
  getKeywordMetrics(projectId: ProjectId, input: GetKeywordMetricsInput, options?: RequestOptions) {
    return this.request<KeywordMetricsResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/keyword-metrics`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.rankChecks.history.export()`. */
  exportRankHistory(
    projectId: ProjectId,
    options: ExportRankHistoryCsvOptions,
    requestOptions?: RequestOptions,
  ): Promise<string>;
  /** @deprecated Use `client.rankChecks.history.export()`. */
  exportRankHistory(
    projectId: ProjectId,
    options?: ExportRankHistoryJsonOptions,
    requestOptions?: RequestOptions,
  ): Promise<RankHistoryExportResponse>;
  /** @deprecated Use `client.rankChecks.history.export()`. */
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

  /** @deprecated Use `client.rankChecks.history.iterate()`. */
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

  /** @deprecated Use `client.sitemapMonitors.list()`. */
  listSitemapMonitors(projectId: ProjectId, options?: RequestOptions) {
    return this.request<SitemapMonitorListResponse>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/sitemap-monitors`,
      options,
    );
  }

  /** @deprecated Use `client.sitemapMonitors.update()`. */
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

  /** @deprecated Use `client.rankChecks.list()`. */
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

  /** @deprecated Use `client.rankChecks.iterate()`. */
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

  /** @deprecated Use `client.rankChecks.run()`. */
  runRankCheck(keywordId: KeywordId, input?: RunRankCheckInput, options?: RunRankCheckOptions) {
    const { async: runAsync, ...requestOptions } = options ?? {};
    const body = input && Object.keys(input).length ? input : undefined;

    return this.request<RankCheck>("POST", `/keywords/${encodedPathSegment(keywordId)}/checks`, {
      ...requestOptions,
      body,
      ...(runAsync ? { query: { async: "true" } } : {}),
    });
  }

  /** @deprecated Use `client.rankChecks.getResult()`. */
  getRankCheckResult(checkId: RankCheckId, options?: RequestOptions) {
    return this.request<RankCheck>("GET", `/rank-checks/${encodedPathSegment(checkId)}`, options);
  }

  /** @deprecated Use `client.signals.create()`. */
  createSignal(input: CreateSignalInput, options?: RequestOptions) {
    return this.request<Signal>("POST", "/signals", { ...options, body: input });
  }

  /** @deprecated Use `client.signals.list()`. */
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

  /** @deprecated Use `client.signals.iterate()`. */
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

  /** @deprecated Use `client.analytics.traffic.list()`. */
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

  /** @deprecated Use `client.analytics.searchPerformance.list()`. */
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

  /** @deprecated Use `client.analytics.traffic.sync()`. */
  syncProjectTraffic(projectId: ProjectId, options?: RequestOptions) {
    return this.request<TrafficSyncSummary>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/analytics/sync`,
      options,
    );
  }

  /** @deprecated Use `client.alertRules.list()`. */
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

  /** @deprecated Use `client.alertRules.iterate()`. */
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

  /** @deprecated Use `client.alertRules.create()`. */
  createAlertRule(projectId: ProjectId, input: CreateAlertRuleInput, options?: RequestOptions) {
    return this.request<AlertRule>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/alert-rules`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.alertRules.update()`. */
  updateAlertRule(ruleId: AlertRuleId, input: UpdateAlertRuleInput, options?: RequestOptions) {
    return this.request<AlertRule>("PATCH", `/alert-rules/${encodedPathSegment(ruleId)}`, {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.alertRules.delete()`. */
  deleteAlertRule(ruleId: AlertRuleId, options?: RequestOptions) {
    return this.request<DeleteAlertRuleResponse>(
      "DELETE",
      `/alert-rules/${encodedPathSegment(ruleId)}`,
      options,
    );
  }

  /** @deprecated Use `client.alerts.list()`. */
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

  /** @deprecated Use `client.alerts.iterate()`. */
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

  /** @deprecated Use `client.alerts.mute()`. */
  muteTriggeredAlert(projectId: ProjectId, alertId: AlertId, options?: RequestOptions) {
    return this.request<TriggeredAlertMuteResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/triggered-alerts/${encodedPathSegment(alertId)}/mute`,
      options,
    );
  }

  /** @deprecated Use `client.alerts.markAllRead({ projectId })`. */
  markProjectAlertsRead(projectId: ProjectId, options?: RequestOptions) {
    return this.request<TriggeredAlertsReadResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/triggered-alerts/mark-read`,
      options,
    );
  }

  /** @deprecated Use `client.team.members.list()`. */
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

  /** @deprecated Use `client.team.members.iterate()`. */
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

  /** @deprecated Use `client.team.invites.list()`. */
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

  /** @deprecated Use `client.team.invites.iterate()`. */
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

  /** @deprecated Use `client.team.invites.create()`. */
  createTeamInvite(projectId: ProjectId, input: CreateTeamInviteInput, options?: RequestOptions) {
    return this.request<CreatedTeamInvite>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/team/invites`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.team.invites.revoke({ id, projectId })`. */
  revokeTeamInvite(projectId: ProjectId, inviteId: InviteId, options?: RequestOptions) {
    return this.request<RevokedTeamInvite>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/team/invites/${encodedPathSegment(inviteId)}`,
      options,
    );
  }

  /** @deprecated Use `client.team.invites.revoke(id)`. */
  revokeTeamInviteById(inviteId: InviteId, options?: RequestOptions) {
    return this.request<RevokedTeamInvite>(
      "DELETE",
      `/team/invites/${encodedPathSegment(inviteId)}`,
      options,
    );
  }

  /** @deprecated Use `client.team.invites.resend()`. */
  resendTeamInvite(projectId: ProjectId, inviteId: InviteId, options?: RequestOptions) {
    return this.request<TeamInviteResendResult>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/team/invites/${encodedPathSegment(inviteId)}/resend`,
      options,
    );
  }

  /** @deprecated Use `client.team.members.updateRole()`. */
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

  /** @deprecated Use `client.team.members.remove()`. */
  removeTeamMember(projectId: ProjectId, memberId: MembershipId, options?: RequestOptions) {
    return this.request<TeamMemberMutationResult>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/team/members/${encodedPathSegment(memberId)}`,
      options,
    );
  }

  /** @deprecated Use `client.providers.list()`. */
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

  /** @deprecated Use `client.providers.iterate()`. */
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

  /** @deprecated Use `client.providers.connect()`. */
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

  /** @deprecated Use `client.providers.test()`. */
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

  /** @deprecated Use `client.providers.updateSettings()`. */
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

  /** @deprecated Use `client.providers.setEnabled()`. */
  setProviderEnabled(
    projectId: ProjectId,
    providerId: string,
    enabled: boolean,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { enabled }, options);
  }

  /** @deprecated Use `client.providers.setEnabled(projectId, providerId, true)`. */
  enableProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.setProviderEnabled(projectId, providerId, true, options);
  }

  /** @deprecated Use `client.providers.setEnabled(projectId, providerId, false)`. */
  disableProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.setProviderEnabled(projectId, providerId, false, options);
  }

  /** @deprecated Use `client.providers.setPriority()`. */
  setProviderPriority(
    projectId: ProjectId,
    providerId: string,
    priority: number,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { priority }, options);
  }

  /** @deprecated Use `client.providers.setPrimary()`. */
  setPrimaryProvider(
    projectId: ProjectId,
    providerId: string,
    primary = true,
    options?: RequestOptions,
  ) {
    return this.updateProviderSettings(projectId, providerId, { primary }, options);
  }

  /** @deprecated Use `client.providers.disconnect()`. */
  disconnectProvider(projectId: ProjectId, providerId: string, options?: RequestOptions) {
    return this.request<ProviderDisconnectResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/providers/${encodedPathSegment(providerId)}`,
      options,
    );
  }

  /** @deprecated Use `client.savedViews.list()`. */
  listSavedViews(
    projectId: ProjectId,
    options?: ListSavedViewsOptions,
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
          surface: pagination.surface,
        },
      },
    );
  }

  /** @deprecated Use `client.savedViews.iterate()`. */
  iterateSavedViews(
    projectId: ProjectId,
    options: ListSavedViewsOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listSavedViews(projectId, pageOptions, requestOptions),
      options,
    );
  }

  /** @deprecated Use `client.savedViews.create()`. */
  createSavedView(projectId: ProjectId, input: CreateSavedViewInput, options?: RequestOptions) {
    return this.request<SavedView>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/saved-views`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.savedViews.delete({ id, projectId })`. */
  deleteSavedView(projectId: ProjectId, viewId: SavedViewId, options?: RequestOptions) {
    return this.request<DeleteSavedViewResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/saved-views/${encodedPathSegment(viewId)}`,
      options,
    );
  }

  /** @deprecated Use `client.savedViews.delete(id)`. */
  deleteSavedViewById(viewId: SavedViewId, options?: RequestOptions) {
    return this.request<DeleteSavedViewResponse>(
      "DELETE",
      `/saved-views/${encodedPathSegment(viewId)}`,
      options,
    );
  }

  /** @deprecated Use `client.keywords.saved.list()` instead. */
  listSavedKeywords(
    projectId: ProjectId,
    options?: PaginationOptions,
    requestOptions?: RequestOptions,
  ) {
    const pagination = options ?? {};

    return this.request<ListResponse<SavedKeyword>>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/saved-keywords`,
      {
        ...requestOptions,
        query: {
          ...(pagination.cursor === undefined ? {} : { cursor: pagination.cursor }),
          ...(pagination.limit === undefined ? {} : { limit: pagination.limit }),
        },
      },
    );
  }

  /** @deprecated Use `client.keywords.saved.iterate()` instead. */
  iterateSavedKeywords(
    projectId: ProjectId,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ) {
    return iterateCursorPagination(
      (pageOptions) => this.listSavedKeywords(projectId, pageOptions, requestOptions),
      options,
    );
  }

  /**
   * Saves keywords for later without putting them under rank tracking.
   * Keywords already tracked or already saved come back as `skipped`.
   * @deprecated Use `client.keywords.saved.create()` instead.
   */
  createSavedKeywords(
    projectId: ProjectId,
    input: CreateSavedKeywordsInput,
    options?: RequestOptions,
  ) {
    return this.request<CreateSavedKeywordsResponse>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/saved-keywords`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.keywords.saved.delete()` instead. */
  deleteSavedKeyword(
    projectId: ProjectId,
    savedKeywordId: SavedKeywordId,
    options?: RequestOptions,
  ) {
    return this.request<DeleteSavedKeywordResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/saved-keywords/${encodedPathSegment(savedKeywordId)}`,
      options,
    );
  }

  /** @deprecated Use `client.competitors.list()`. */
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

  /** @deprecated Use `client.competitors.iterate()`. */
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

  /** @deprecated Use `client.competitors.add()`. */
  addCompetitor(projectId: ProjectId, input: AddCompetitorInput, options?: RequestOptions) {
    return this.request<Competitor>(
      "POST",
      `/projects/${encodedPathSegment(projectId)}/competitors`,
      { ...options, body: input },
    );
  }

  /** @deprecated Use `client.competitors.remove({ id, projectId })`. */
  removeCompetitor(projectId: ProjectId, competitorId: CompetitorId, options?: RequestOptions) {
    return this.request<RemoveCompetitorResponse>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/competitors/${encodedPathSegment(competitorId)}`,
      options,
    );
  }

  /** @deprecated Use `client.competitors.remove(id)`. */
  removeCompetitorById(competitorId: CompetitorId, options?: RequestOptions) {
    return this.request<RemoveCompetitorResponse>(
      "DELETE",
      `/competitors/${encodedPathSegment(competitorId)}`,
      options,
    );
  }

  /** @deprecated Use `client.notificationSettings.get()`. */
  getNotificationPreferences(projectId: ProjectId, options?: RequestOptions) {
    return this.request<NotificationPreferences>(
      "GET",
      `/projects/${encodedPathSegment(projectId)}/notification-preferences`,
      options,
    );
  }

  /** @deprecated Use `client.notificationSettings.update()`. */
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

  /** @deprecated Use `client.imports.tokens.list()`. */
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

  /** @deprecated Use `client.imports.tokens.iterate()`. */
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

  /** @deprecated Use `client.imports.tokens.create()`. */
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

  /** @deprecated Use `client.imports.tokens.revoke({ id, projectId })`. */
  revokeMigrationToken(projectId: ProjectId, tokenId: MigrationTokenId, options?: RequestOptions) {
    return this.request<RevokedMigrationToken>(
      "DELETE",
      `/projects/${encodedPathSegment(projectId)}/migration-tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  /** @deprecated Use `client.imports.tokens.revoke(id)`. */
  revokeMigrationTokenById(tokenId: MigrationTokenId, options?: RequestOptions) {
    return this.request<RevokedMigrationToken>(
      "DELETE",
      `/migration-tokens/${encodedPathSegment(tokenId)}`,
      options,
    );
  }

  /** @deprecated Use `client.imports.compatibility.get()`. */
  getCloudImportCompatibility(options?: RequestOptions) {
    return this.request<CloudImportCompatibility>("GET", "/cloud/import/compatibility", {
      ...options,
      auth: false,
    });
  }

  /** @deprecated Use `client.imports.runFromExport()`. */
  importCloudExport(input: CloudImportPackage, options?: RequestOptions) {
    return this.request<CloudImportFinalizeResponse>("POST", "/cloud/import", {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.imports.sessions.create()`. */
  createCloudImportSession(input: CloudImportSessionCreate, options?: RequestOptions) {
    return this.request<CloudImportSessionCreateResponse>("POST", "/cloud/import/sessions", {
      ...options,
      body: input,
    });
  }

  /** @deprecated Use `client.imports.sessions.uploadChunk()`. */
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

  /** @deprecated Use `client.imports.sessions.finalize()`. */
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

  private assertApiVersionCompatible(response: CapabilitiesResponse) {
    const advertised = (response as { apiVersions?: unknown }).apiVersions;
    if (advertised === undefined) {
      return;
    }
    if (!Array.isArray(advertised) || advertised.some((version) => typeof version !== "string")) {
      throw new BisibilityResponseError(
        "Bisibility API returned invalid API version capabilities.",
        {
          body: JSON.stringify(response),
          cause: undefined,
          method: "GET",
          status: 200,
          url: this.buildUrl("/capabilities"),
        },
      );
    }
    if (advertised.includes(BISIBILITY_API_VERSION)) {
      return;
    }

    const detail = `The declared API version ${BISIBILITY_API_VERSION} is not served by this server.`;
    const problem: ProblemDetails = {
      detail,
      errors: {
        apiVersions: advertised,
        declaredApiVersion: BISIBILITY_API_VERSION,
      },
      status: 409,
      title: "Unsupported API version",
      type: UNSUPPORTED_API_VERSION_PROBLEM_TYPE,
    };
    throw new BisibilityApiVersionError(detail, {
      body: JSON.stringify(problem),
      declaredApiVersion: BISIBILITY_API_VERSION,
      headers: new Headers(),
      method: "GET",
      problem,
      serverApiVersions: advertised,
      status: 409,
      url: this.buildUrl("/capabilities"),
    });
  }

  private ensureApiVersionPreflight(
    signal: AbortSignal | undefined,
    timeout: number | null | undefined,
  ) {
    if (this.#apiVersionPreflight === undefined) {
      const options: InternalRequestOptions = {
        auth: false,
        skipApiVersionPreflight: true,
      };
      if (signal !== undefined) {
        options.signal = signal;
      }
      if (timeout !== undefined) {
        options.timeout = timeout;
      }
      const pending = this.request<CapabilitiesResponse>("GET", "/capabilities", options).then(
        (response) => {
          this.assertApiVersionCompatible(response);
        },
      );
      const cached = pending.catch((error: unknown) => {
        if (!(error instanceof BisibilityApiVersionError) && this.#apiVersionPreflight === cached) {
          this.#apiVersionPreflight = undefined;
        }
        throw error;
      });
      this.#apiVersionPreflight = cached;
    }

    return this.#apiVersionPreflight;
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
    if (!options.skipApiVersionPreflight) {
      await this.ensureApiVersionPreflight(options.signal, options.timeout);
    }
    if (options.auth !== false) {
      headers.set("Authorization", `Bearer ${this.#apiKey}`);
    }
    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    headers.set("X-Bisibility-Client", CLIENT_ID);
    headers.set(BISIBILITY_API_VERSION_HEADER, BISIBILITY_API_VERSION);
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

      if (!response.ok && !options.acceptedStatuses?.includes(response.status)) {
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

    if (response.status === 409 && isUnsupportedApiVersionProblem(problem)) {
      const details = apiVersionErrorDetails(problem);
      return new BisibilityApiVersionError(message, {
        body,
        declaredApiVersion: details.declaredApiVersion,
        headers,
        method,
        problem,
        serverApiVersions: details.serverApiVersions,
        status: response.status,
        url,
      });
    }

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
