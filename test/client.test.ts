import { inspect } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BisibilityApiError,
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityNetworkError,
  BisibilityResponseError,
  createBisibilityClient,
} from "../src/index.js";
import type {
  ActiveMigrationToken,
  AlertRule,
  ApiKey,
  Capability,
  CloudImportChunkResponse,
  CloudImportCompatibility,
  CloudImportFinalizeResponse,
  CloudImportSessionCreateResponse,
  Competitor,
  CompetitorListResponse,
  CreateKeywordsResponse,
  CreatedApiKey,
  CreatedTeamInvite,
  FlatCostEstimate,
  FlatProviderRate,
  HealthResponse,
  IssuedMigrationToken,
  Keyword,
  KeywordBulkResponse,
  KeywordMetricsResponse,
  KeywordResearchResponse,
  ListResponse,
  LocationSuggestionsResponse,
  MigrationTokenListResponse,
  NotificationPreferences,
  OpenApiDocument,
  PageTrafficSnapshotsResponse,
  PlanCostEstimate,
  PlanProviderRate,
  Project,
  ProjectDefaults,
  Provider,
  ProviderConnection,
  ProviderTestResult,
  RankCheck,
  RankHistoryExportResponse,
  RankedKeywordSuggestionsResponse,
  SavedView,
  SearchPerformanceQueryStatsResponse,
  Signal,
  SitemapMonitorListResponse,
  TeamInvite,
  TeamMember,
  TrafficSyncSummary,
  TriggeredAlert,
} from "../src/index.js";

type FetchMock = ReturnType<
  typeof vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>
>;

const apiKey = "bsk_live_1234567890abcdef";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers)),
    },
    status: init.status ?? 200,
  });
}

function textResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...Object.fromEntries(new Headers(init.headers)),
    },
    status: init.status ?? 200,
  });
}

function list<T>(data: T[], nextCursor: string | null = null): ListResponse<T> {
  return { data, meta: { next_cursor: nextCursor } };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    created_at: "2026-01-01T00:00:00.000Z",
    domain: "example.com",
    id: "prj_1",
    name: "Example",
    updated_at: "2026-01-02T00:00:00.000Z",
    write_mode: "active",
    ...overrides,
  };
}

function projectDefaults(overrides: Partial<ProjectDefaults> = {}): ProjectDefaults {
  return {
    city: null,
    country: "United States",
    cron_expression: null,
    device: "desktop",
    frequency: "daily",
    jitter_minutes: 60,
    last_checked_at: null,
    location_key: "US",
    next_check_at: "2026-01-05T00:00:00.000Z",
    project_id: "prj_1",
    serp_depth: 100,
    serp_stop_on_match: false,
    source: "explicit",
    timezone: "UTC",
    updated_at: "2026-01-04T00:00:00.000Z",
    ...overrides,
  };
}

function apiKeyResource(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    created_at: "2026-01-01T00:00:00.000Z",
    id: "key_1",
    last_used_at: null,
    name: "Production",
    prefix: "bsk_live_12345678",
    revoked_at: null,
    ...overrides,
  };
}

function keyword(overrides: Partial<Keyword> = {}): Keyword {
  return {
    country: "United States",
    created_at: "2026-01-03T00:00:00.000Z",
    device: "desktop",
    id: "kw_1",
    intent: null,
    latest_position: 4,
    location: "United States",
    previous_position: 8,
    project_id: "prj_1",
    ranking_url: "https://example.com/page",
    schedule: null,
    tags: ["Product"],
    target_url: "https://example.com/page",
    text: "rank tracker",
    topic: null,
    updated_at: "2026-01-04T00:00:00.000Z",
    ...overrides,
  };
}

function rankCheck(overrides: Partial<RankCheck> = {}): RankCheck {
  return {
    attempts: null,
    checked_at: "2026-01-06T00:00:00.000Z",
    cost_cents: 0.06,
    error: null,
    id: "check_1",
    keyword_id: "kw_1",
    position: 4,
    previous_position: 8,
    provider: "dataforseo",
    ranking_url: "https://example.com/page",
    status: "completed",
    ...overrides,
  };
}

function alertRule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    channel: "Email",
    channels: ["email"],
    condition: "rank crosses below #10",
    condition_type: "threshold",
    enabled: true,
    fires: "2 this week",
    id: "rule_1",
    name: "Ranking drop",
    period: "Each check",
    scope: "All keywords",
    severity: "urgent",
    status: "active",
    target_ids: [],
    target_type: "all",
    threshold_position: 10,
    ...overrides,
  };
}

function triggeredAlert(overrides: Partial<TriggeredAlert> = {}): TriggeredAlert {
  return {
    action: "Review the latest rank check.",
    ctas: ["Open keyword"],
    current: "#12",
    headline: "Ranking drop",
    id: "ta_1",
    keyword: "rank tracker",
    previous: "#4",
    rule: "Ranking drop",
    severity: "urgent",
    unread: true,
    when: "just now",
    ...overrides,
  };
}

function teamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    color: "accent",
    email: "owner@example.com",
    id: "mem_1",
    initials: "OE",
    name: "Owner Example",
    role: "Owner",
    role_value: "owner",
    ...overrides,
  };
}

function teamInvite(overrides: Partial<TeamInvite> = {}): TeamInvite {
  return {
    email: "new@example.com",
    expires_label: "expires in 7d",
    id: "inv_1",
    invited_label: "invited just now",
    role: "Viewer",
    role_value: "viewer",
    ...overrides,
  };
}

function provider(overrides: Partial<Provider> = {}): Provider {
  return {
    category_id: "serp",
    category_title: "SERP providers",
    description: "SerpAPI rank-data provider.",
    drawer: {
      activities: [{ label: "Last used", value: "Never" }],
      cost_help: "Provider billing remains direct between you and the provider.",
      credential_fields: [{ label: "API key", name: "secret", placeholder: "Stored" }],
      defaults: {
        cost_per_check: 0,
        depth: "Top 100",
        device: "Desktop",
        enabled: true,
        language: "English",
        location: "United States",
        login: "",
        primary: false,
        priority: 100,
        secret: "",
      },
      env_hint: "Credentials can also be configured through environment variables.",
      primary_toggle_label: "Set as primary serp provider",
    },
    icon: "globe",
    id: "serpapi",
    meta: [{ label: "State", value: "Ready" }],
    name: "SerpAPI",
    status: "ready",
    tint: "var(--accent)",
    ...overrides,
  };
}

function providerConnection(overrides: Partial<ProviderConnection> = {}): ProviderConnection {
  return {
    cost_per_check_cents: 0.01,
    created_at: "2026-01-01T00:00:00.000Z",
    credentials_hash: null,
    enabled: true,
    id: "pc_1",
    is_primary: true,
    kind: "serp",
    last_used_at: null,
    priority: 0,
    project_id: "prj_1",
    provider: "serpapi",
    status: "connected",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

const savedViewConfig = {
  filters: {
    change: "any",
    contains: "",
    country: "all",
    device: "all",
    position: [],
    serp: [],
    tags: ["Product"],
    vol_max: 50,
    vol_min: 0,
    wrong_url: false,
  },
  search: "rank",
} satisfies SavedView["config"];

function savedView(overrides: Partial<SavedView> = {}): SavedView {
  return {
    config: savedViewConfig,
    created_at: "2026-01-07T00:00:00.000Z",
    created_by_id: "usr_1",
    id: "view_1",
    name: "Product keywords",
    ...overrides,
  };
}

function competitor(overrides: Partial<Competitor> = {}): Competitor {
  return {
    domain: "rankzly.io",
    id: "comp_1",
    initials: "R",
    label: "Rankzly",
    ...overrides,
  };
}

function notificationPreferences(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    alert_email: true,
    alert_in_app: true,
    alert_slack: false,
    alert_webhook: false,
    check_email: false,
    check_in_app: true,
    email: "owner@example.com",
    email_verification: "verified",
    import_email: true,
    import_in_app: true,
    invite_email: true,
    invite_in_app: true,
    project_id: "prj_1",
    slack_available: true,
    webhook_available: false,
    ...overrides,
  };
}

function activeMigrationToken(overrides: Partial<ActiveMigrationToken> = {}): ActiveMigrationToken {
  return {
    created_at: "2026-01-08T00:00:00.000Z",
    created_by: { email: "owner@example.com", name: "Owner Example" },
    expires_at: "2026-01-08T01:00:00.000Z",
    id: "tok_1",
    scope: "full",
    single_use: true,
    ...overrides,
  };
}

function migrationJob(): MigrationTokenListResponse["meta"]["import_job"] {
  return {
    counts: null,
    created_at: "2026-01-08T00:00:00.000Z",
    error: null,
    finished_at: null,
    id: "job_1",
    progress: 0,
    started_at: null,
    state: "idle",
  };
}

function issuedMigrationToken(overrides: Partial<IssuedMigrationToken> = {}): IssuedMigrationToken {
  return {
    ...activeMigrationToken(),
    import_job: migrationJob(),
    token: "mig_secret",
    ...overrides,
  };
}

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    created_at: "2026-07-04T19:31:00.000Z",
    happened_at: "2026-07-04T19:30:00.000Z",
    id: "sig_1",
    keyword_id: "kw_1",
    payload: { version: "1.2.3" },
    project_id: "prj_1",
    public_id: "sig_1",
    severity: "warning",
    source: "deploy",
    type: "deploy.completed",
    url: "https://example.com/releases/1",
    ...overrides,
  };
}

function flatProviderRate(overrides: Partial<FlatProviderRate> = {}): FlatProviderRate {
  return {
    checked_at: "2026-06-01",
    label: "DataForSEO",
    options: [
      {
        key: "standard",
        label: "Standard queue",
        short_label: "Standard",
        turnaround: "~5 min",
        unit_cost_cents: 0.06,
        unit_cost_usd: 0.0006,
      },
    ],
    pricing_model: "flat",
    provider_id: "dataforseo",
    source_url: "https://dataforseo.com/pricing",
    ...overrides,
  };
}

function planProviderRate(overrides: Partial<PlanProviderRate> = {}): PlanProviderRate {
  return {
    checked_at: "2026-06-01",
    label: "SerpAPI",
    notes: "Plans include a fixed number of monthly searches.",
    plans: [
      {
        included_checks: 5000,
        label: "Developer",
        monthly_price_cents: 7500,
        monthly_price_usd: 75,
        plan_key: "developer",
      },
    ],
    pricing_model: "plan",
    provider_id: "serpapi",
    source_url: "https://serpapi.com/pricing",
    ...overrides,
  };
}

function costEstimate(overrides: Partial<FlatCostEstimate> = {}): FlatCostEstimate {
  return {
    checks_per_run: 248,
    effective_cost_per_check_cents: 0.06,
    exceeds_largest_plan: false,
    exceeds_selected_plan: false,
    monthly_checks: 7440,
    monthly_cost_cents: 446.4,
    monthly_cost_usd: 4.464,
    pricing_model: "flat",
    provider_id: "dataforseo",
    rate_checked_at: "2026-06-01",
    rate_source_url: "https://dataforseo.com/pricing",
    selected_option: {
      key: "standard",
      label: "Standard queue",
      short_label: "Standard",
      turnaround: "~5 min",
      unit_cost_cents: 0.06,
      unit_cost_usd: 0.0006,
    },
    ...overrides,
  };
}

function createClient(
  fetchMock: FetchMock,
  options: Partial<ConstructorParameters<typeof BisibilityClient>[0]> = {},
) {
  return new BisibilityClient({
    apiKey,
    baseUrl: "https://api.test/api/v1/",
    fetch: fetchMock,
    ...options,
  });
}

function lastCall(fetchMock: FetchMock) {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }

  const [url, init] = call;
  return { headers: new Headers(init?.headers), init, url: String(url) };
}

function expectJsonBody(init: RequestInit | undefined, expected: unknown) {
  expect(init?.body).toBe(JSON.stringify(expected));
}

function abortAwareFetch(): FetchMock {
  return vi.fn(
    (_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("abortAwareFetch expected init.signal to be set, but it was missing."));
          return;
        }
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
}

describe("BisibilityClient discovery methods", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it("gets health without requiring an API key", async () => {
    const body: HealthResponse = {
      checked_at: "2026-01-01T00:00:00.000Z",
      providers: { serp: ["dataforseo"] },
      services: { app: "ok", database: "ok" },
      status: "ok",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const client = new BisibilityClient({ baseUrl: "/api/v1", fetch: fetchMock });
    await expect(client.getHealth()).resolves.toEqual(body);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("/api/v1/health");
    expect(call.headers.has("Authorization")).toBe(false);
  });

  it("gets the OpenAPI document", async () => {
    const body: OpenApiDocument = { info: { title: "Bisibility" }, openapi: "3.1.0", paths: {} };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    await expect(createClient(fetchMock).getOpenApi()).resolves.toEqual(body);
    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/openapi.json");
  });

  it("gets capabilities as the server data envelope", async () => {
    const capability: Capability = {
      description: "Add one or more keywords",
      input_schema: { type: "object" },
      name: "addKeywords",
      operationId: "addKeywords",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [capability] }));

    await expect(createClient(fetchMock).getCapabilities()).resolves.toEqual({
      data: [capability],
    });
    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/capabilities");
  });

  it("gets llms.txt as text", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("# Bisibility API v1"));

    await expect(createClient(fetchMock).getLlmsText()).resolves.toBe("# Bisibility API v1");
    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/llms.txt");
  });

  it("gets provider rates without requiring an API key", async () => {
    const body = { data: [flatProviderRate(), planProviderRate()] };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const client = new BisibilityClient({ baseUrl: "/api/v1", fetch: fetchMock });
    const result = await client.getProviderRates();

    expect(result).toEqual(body);
    expect(result.data[0]?.pricing_model).toBe("flat");
    expect(result.data[1]?.pricing_model).toBe("plan");
    const call = lastCall(fetchMock);
    expect(call.url).toBe("/api/v1/provider-rates");
    expect(call.init?.method).toBe("GET");
    expect(call.headers.has("Authorization")).toBe(false);
  });

  it("gets a flat cost estimate from query parameters without requiring an API key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: costEstimate() }));

    const client = new BisibilityClient({ baseUrl: "/api/v1", fetch: fetchMock });
    const result = await client.getCostEstimate({
      devices: 1,
      frequency: "daily",
      keywords: 248,
      locations: 1,
      option: "standard",
      provider: "dataforseo",
    });

    expect(result.data).toMatchObject({
      checks_per_run: 248,
      monthly_checks: 7440,
      monthly_cost_usd: 4.464,
      pricing_model: "flat",
      provider_id: "dataforseo",
      selected_option: expect.objectContaining({ key: "standard" }),
    });
    const call = lastCall(fetchMock);
    expect(call.url).toBe(
      "/api/v1/cost-estimate?devices=1&frequency=daily&keywords=248&locations=1&option=standard&provider=dataforseo",
    );
    expect(call.headers.has("Authorization")).toBe(false);
  });

  it("gets a plan cost estimate with only the required keywords parameter", async () => {
    const { selected_option: _flatOnlyOption, pricing_model: _flatModel, ...base } = costEstimate();
    const estimate: PlanCostEstimate = {
      ...base,
      checks_per_run: 5000,
      monthly_checks: 5000,
      monthly_cost_cents: 7500,
      monthly_cost_usd: 75,
      pricing_model: "plan",
      provider_id: "serpapi",
      rate_source_url: "https://serpapi.com/pricing",
      selected_plan: {
        included_checks: 5000,
        label: "Developer",
        monthly_price_cents: 7500,
        monthly_price_usd: 75,
        plan_key: "developer",
      },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: estimate }));

    const result = await createClient(fetchMock).getCostEstimate({ keywords: 5000 });

    const data = result.data;
    if (data.pricing_model !== "plan") {
      throw new Error(`Expected a plan estimate, got ${data.pricing_model}`);
    }
    expect(data.selected_plan).toMatchObject({ plan_key: "developer" });
    expect("selected_option" in data).toBe(false);
    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/cost-estimate?keywords=5000");
  });

  it("searches canonical locations with serialized filters", async () => {
    const body: LocationSuggestionsResponse = {
      data: [
        {
          city_name: "Austin",
          country_code: "US",
          display_name: "Austin, Texas, United States",
          hl: "en",
          id: "loc_1",
          kind: "city",
          language_label: "English",
          location_key: "US/Texas/Austin",
          region_code: "TX",
          region_name: "Texas",
        },
      ],
      meta: { next_cursor: null },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    await expect(
      createClient(fetchMock).searchLocations({ country: "US", limit: 20, q: "Austin" }),
    ).resolves.toEqual(body);

    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/locations/search?country=US&limit=20&q=Austin",
    );
  });
});

describe("BisibilityClient protected resources", () => {
  let fetchMock: FetchMock;
  let client: BisibilityClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = createClient(fetchMock);
  });

  it("sends bearer auth and default headers on protected requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([project()])));

    const withHeaders = createClient(fetchMock, { headers: { "X-Client": "sdk-test" } });
    await withHeaders.listProjects({ headers: { "X-Request": "request" } });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/projects");
    expect(call.init?.method).toBe("GET");
    expect(call.init?.redirect).toBe("error");
    expect(call.headers.get("Authorization")).toBe(`Bearer ${apiKey}`);
    expect(call.headers.get("X-Client")).toBe("sdk-test");
    expect(call.headers.get("X-Request")).toBe("request");
  });

  it("does not expose credentials through object inspection or serialization", () => {
    const secret = "bsk_live_do_not_log_this";
    const inspectedClient = new BisibilityClient({
      apiKey: secret,
      baseUrl: "https://api.test/api/v1",
      headers: { "X-Api-Key": "default-header-secret" },
      projectId: "prj_private",
    });

    expect(Object.keys(inspectedClient)).toEqual(["baseUrl"]);
    expect(JSON.stringify(inspectedClient)).not.toContain(secret);
    expect(JSON.stringify(inspectedClient)).not.toContain("default-header-secret");
    expect(inspect(inspectedClient)).not.toContain(secret);
    expect(inspect(inspectedClient)).not.toContain("default-header-secret");
  });

  it("uses the default production API URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([project()])));

    const defaultClient = new BisibilityClient({ apiKey, fetch: fetchMock });
    await defaultClient.listProjects();

    expect(lastCall(fetchMock).url).toBe("https://bisibility.com/api/v1/projects");
  });

  it("accepts URL objects for baseUrl", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([project()])));

    const urlClient = new BisibilityClient({
      apiKey,
      baseUrl: new URL("https://api.test/api/v1/"),
      fetch: fetchMock,
    });
    await urlClient.listProjects();

    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/projects");
  });

  it("lists and gets projects", async () => {
    const projectList = list([project()]);
    fetchMock.mockResolvedValueOnce(jsonResponse(projectList));
    fetchMock.mockResolvedValueOnce(jsonResponse(project({ id: "prj spaced" })));

    await expect(client.listProjects()).resolves.toEqual(projectList);
    await expect(client.getProject("prj spaced")).resolves.toMatchObject({ id: "prj spaced" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/projects");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/projects/prj%20spaced");
  });

  it("uses a PAT project selector and lets request headers override it", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword()));
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword()));
    const patClient = createClient(fetchMock, {
      apiKey: "bsp_live_1234567890abcdef",
      projectId: "prj_default",
    });

    await patClient.getKeyword("kw_1");
    await patClient.getKeyword("kw_1", {
      headers: { "X-Bisibility-Project": "prj_override" },
    });

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("X-Bisibility-Project")).toBe(
      "prj_default",
    );
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("X-Bisibility-Project")).toBe(
      "prj_override",
    );
  });

  it("gets and updates the user and manages personal tokens", async () => {
    const me = {
      email: "owner@example.com",
      id: "user_1",
      name: "Owner",
      projects: [{ domain: "example.com", id: "prj_1", name: "Example", role: "owner" }],
    } as const;
    const token = {
      created_at: "2026-07-12T00:00:00.000Z",
      expires_at: null,
      id: "pat_1",
      last_used_at: null,
      name: "CLI",
      prefix: "bsp_live_example",
      revoked_at: null,
      scope: "admin",
    } as const;
    const issued = { ...token, masked_value: "bsp_live_example******abcd", token: "bsp_live_raw" };
    fetchMock.mockResolvedValueOnce(jsonResponse(me));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...me, name: "Renamed" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(list([token])));
    fetchMock.mockResolvedValueOnce(jsonResponse(issued, { status: 201 }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...token, revoked_at: "2026-07-12T01:00:00.000Z" }),
    );

    await expect(client.getMe()).resolves.toEqual(me);
    await expect(client.updateMe({ name: "Renamed" })).resolves.toMatchObject({ name: "Renamed" });
    await expect(client.listMyTokens()).resolves.toMatchObject({ data: [token] });
    await expect(
      client.createMyToken({ expires_in_days: 90, name: "CLI", scope: "admin" }),
    ).resolves.toEqual(issued);
    await expect(client.revokeMyToken("current")).resolves.toMatchObject({ id: "pat_1" });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://api.test/api/v1/me",
      "https://api.test/api/v1/me",
      "https://api.test/api/v1/me/tokens",
      "https://api.test/api/v1/me/tokens",
      "https://api.test/api/v1/me/tokens/current",
    ]);
    expectJsonBody(fetchMock.mock.calls[3]?.[1], {
      expires_in_days: 90,
      name: "CLI",
      scope: "admin",
    });
  });

  it("creates projects, project API keys, and webhook endpoints", async () => {
    const createdKey: CreatedApiKey = {
      ...apiKeyResource({ id: "key_ci", name: "CI" }),
      masked_value: "bsk_live_12345678******cdef",
      token: apiKey,
    };
    const webhook = {
      created_at: "2026-07-12T00:00:00.000Z",
      description: "CI",
      enabled: true,
      id: "wh_1",
      last_delivery_at: null,
      updated_at: "2026-07-12T00:00:00.000Z",
      url: "https://example.com/hook",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(project(), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(list([apiKeyResource()])));
    fetchMock.mockResolvedValueOnce(jsonResponse(createdKey, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(list([webhook])));
    fetchMock.mockResolvedValueOnce(jsonResponse(webhook, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...webhook, enabled: false }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...webhook, enabled: false }));

    await client.createProject({
      domain: "example.com",
      name: "Example",
      tracking_scope: "country",
    });
    await client.listProjectApiKeys("prj_1");
    await client.createProjectApiKey("prj_1", { name: "CI" });
    await client.listWebhooks("prj_1");
    await client.createWebhook("prj_1", {
      description: "CI",
      hmac_secret: "1234567890123456",
      url: webhook.url,
    });
    await client.updateWebhook("prj_1", "wh_1", { enabled: false });
    await client.deleteWebhook("prj_1", "wh_1");

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://api.test/api/v1/projects",
      "https://api.test/api/v1/projects/prj_1/api-keys",
      "https://api.test/api/v1/projects/prj_1/api-keys",
      "https://api.test/api/v1/projects/prj_1/webhooks",
      "https://api.test/api/v1/projects/prj_1/webhooks",
      "https://api.test/api/v1/projects/prj_1/webhooks/wh_1",
      "https://api.test/api/v1/projects/prj_1/webhooks/wh_1",
    ]);
    expectJsonBody(fetchMock.mock.calls[0]?.[1], {
      domain: "example.com",
      name: "Example",
      tracking_scope: "country",
    });
  });

  it("updates a project, deletes a project, and patches project defaults", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(project({ name: "Renamed" })));
    fetchMock.mockResolvedValueOnce(jsonResponse(project({ write_mode: "migration_hold" })));
    fetchMock.mockResolvedValueOnce(jsonResponse(projectDefaults({ city: "Austin" })));

    await expect(
      client.updateProject("prj 1", { domain: "renamed.example", name: "Renamed" }),
    ).resolves.toMatchObject({ name: "Renamed", write_mode: "active" });
    await expect(client.deleteProject("prj_1")).resolves.toMatchObject({
      id: "prj_1",
      write_mode: "migration_hold",
    });
    await expect(
      client.updateProjectDefaults(
        "prj_1",
        {
          city: "Austin",
          country: "United States",
          device: "desktop",
          frequency: "daily",
          location_key: "US/Texas/Austin",
          serp_stop_on_match: true,
        },
        { idempotencyKey: "idem_defaults" },
      ),
    ).resolves.toEqual(projectDefaults({ city: "Austin" }));

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/projects/prj%201");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[0]?.[1], { domain: "renamed.example", name: "Renamed" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/projects/prj_1");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/defaults");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("PATCH");
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_defaults",
    );
    expectJsonBody(fetchMock.mock.calls[2]?.[1], {
      city: "Austin",
      country: "United States",
      device: "desktop",
      frequency: "daily",
      location_key: "US/Texas/Austin",
      serp_stop_on_match: true,
    });
  });

  it("gets project defaults with an encoded id and forwards request options", async () => {
    const signal = new AbortController().signal;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(projectDefaults({ city: "New York", location_key: "US/New York/New York" })),
    );

    await expect(
      client.getProjectDefaults("prj/ one", {
        headers: { "X-Trace-Id": "trace_defaults" },
        signal,
        timeout: null,
      }),
    ).resolves.toEqual(projectDefaults({ city: "New York", location_key: "US/New York/New York" }));

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/projects/prj%2F%20one/defaults");
    expect(call.init?.method).toBe("GET");
    expect(call.init?.body).toBeUndefined();
    expect(call.init?.signal).toBe(signal);
    expect(call.headers.get("X-Trace-Id")).toBe("trace_defaults");
  });

  it("maps a project defaults 403 through BisibilityApiError", async () => {
    const problem = {
      detail: "You cannot read defaults for this project.",
      status: 403,
      title: "Forbidden",
      type: "https://bisibility.dev/problems/forbidden",
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(problem, {
        headers: { "Retry-After": "30" },
        status: 403,
      }),
    );

    await expect(client.getProjectDefaults("prj_1")).rejects.toMatchObject({
      message: problem.detail,
      name: "BisibilityApiError",
      problem,
      retryAfterSeconds: 30,
      status: 403,
    });
  });

  it("lists, creates, and revokes API keys", async () => {
    const created: CreatedApiKey = {
      ...apiKeyResource({ id: "key_new", name: "CI" }),
      masked_value: "bsk_live_12345678******cdef",
      token: apiKey,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(list([apiKeyResource()], "cursor_1")));
    fetchMock.mockResolvedValueOnce(jsonResponse(created, { status: 201 }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(apiKeyResource({ revoked_at: "2026-01-03T00:00:00.000Z" })),
    );

    await expect(client.listApiKeys({ cursor: "cursor 1", limit: 10 })).resolves.toMatchObject({
      meta: { next_cursor: "cursor_1" },
    });
    await expect(
      client.createApiKey({ name: "CI" }, { idempotencyKey: "idem_1" }),
    ).resolves.toEqual(created);
    await expect(client.revokeApiKey("key_1")).resolves.toMatchObject({ id: "key_1" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/api-keys?cursor=cursor+1&limit=10",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/api-keys");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_1",
    );
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { name: "CI" });
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.test/api/v1/api-keys/key_1");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");
  });

  it("preserves an explicit content type and forwards abort signals", async () => {
    const signal = new AbortController().signal;
    fetchMock.mockResolvedValueOnce(jsonResponse(apiKeyResource({ id: "key_new", name: "CI" })));

    await client.createApiKey(
      { name: "CI" },
      { headers: { "Content-Type": "application/vnd.bisibility+json" }, signal },
    );

    const call = lastCall(fetchMock);
    expect(call.headers.get("Content-Type")).toBe("application/vnd.bisibility+json");
    expect(call.init?.signal).toBe(signal);
  });

  it("lists keywords with all supported filters", async () => {
    const keywordList = list([keyword()], "next_1");
    fetchMock.mockResolvedValueOnce(jsonResponse(keywordList));

    const result = await client.listKeywords("prj_1", {
      country: "United States",
      cursor: "cursor_1",
      device: "desktop",
      intent: "commercial",
      limit: 25,
      positionGt: 3,
      positionLt: 10,
      search: "rank tracker",
      sort: "-updated_at",
      tag: "Product",
      topic: "tracking",
    });

    expect(result).toEqual(keywordList);
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/projects/prj_1/keywords?cursor=cursor_1&filter%5Bcountry%5D=United+States&filter%5Bdevice%5D=desktop&filter%5Bintent%5D=commercial&filter%5Bposition_gt%5D=3&filter%5Bposition_lt%5D=10&filter%5Btag%5D=Product&filter%5Btopic%5D=tracking&limit=25&search=rank+tracker&sort=-updated_at",
    );
  });

  it("lists ranked keyword suggestions with tracked and cache metadata", async () => {
    const body: RankedKeywordSuggestionsResponse = {
      cached: false,
      connections: [{ id: "conn_1", label: "DataForSEO", provider: "dataforseo" }],
      cost_cents: 2,
      fetched_at: "2026-07-22T10:00:00.000Z",
      offset: 100,
      rows: [
        {
          already_tracked: true,
          estimated_traffic: 61.2,
          keyword: "rank tracker api",
          position: 4,
          search_volume: 720,
        },
      ],
      total_count: 184,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const result = await client.listRankedKeywordSuggestions("prj 1", {
      connectionId: "conn 1",
      fresh: true,
      limit: 100,
      offset: 100,
    });

    expect(result).toEqual(body);
    expect(result.cached).toBe(false);
    expect(result.rows[0]?.already_tracked).toBe(true);
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/projects/prj%201/ranked-keyword-suggestions?connection_id=conn+1&fresh=true&limit=100&offset=100",
    );
  });

  it("researches keywords with spending controls and maps partial source diagnostics", async () => {
    const body: KeywordResearchResponse = {
      cached: false,
      connections: [{ id: "conn_1", label: "DataForSEO", provider: "dataforseo" }],
      cost_cents: 4,
      fetched_at: "2026-07-22T10:00:00.000Z",
      provider: "DataForSEO",
      rows: [
        {
          already_tracked: true,
          competition: null,
          cpc_cents: 187,
          difficulty: null,
          intent: null,
          keyword: "rank tracker api",
          monthly_trend: [{ month: 7, search_volume: null, year: 2026 }],
          search_volume: 720,
          source: "related",
        },
      ],
      sources: [
        {
          cached: false,
          cost_cents: 4,
          returned: 1,
          source: "related",
          status: "ok",
        },
        {
          cached: false,
          cost_cents: 0,
          reason: "budget_exhausted",
          returned: 0,
          source: "suggestion",
          status: "failed",
        },
        {
          cached: false,
          cost_cents: 0,
          reason: "previous_source_failed",
          returned: 0,
          source: "idea",
          status: "skipped",
        },
      ],
      total_count: 1,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const result = await client.researchKeywords("prj 1", {
      connectionId: "conn 1",
      estimateOnly: false,
      fresh: true,
      includeClickstream: true,
      maxCostCents: 7,
      mode: "related",
      resultLimit: 300,
      seed: "rank tracker",
    });

    expect(result).toEqual(body);
    expect(result.cached).toBe(false);
    expect(result.rows[0]).toMatchObject({
      already_tracked: true,
      difficulty: null,
      intent: null,
      source: "related",
    });
    expect(result.sources).toEqual(body.sources);
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/projects/prj%201/keyword-research?connection_id=conn+1&estimate_only=false&fresh=true&include_clickstream=true&max_cost_cents=7&mode=related&result_limit=300&seed=rank+tracker",
    );
  });

  it("maps a cache-aware keyword research estimate", async () => {
    const body: KeywordResearchResponse = {
      cached: false,
      connections: [{ id: "conn_1", label: "DataForSEO", provider: "dataforseo" }],
      cost_cents: 0,
      estimate: true,
      fetched_at: "2026-07-22T10:00:00.000Z",
      provider: "DataForSEO",
      rows: [],
      sources: [
        {
          cached: true,
          cost_cents: 0,
          returned: 0,
          source: "related",
          status: "ok",
        },
        {
          cached: false,
          cost_cents: 2,
          returned: 0,
          source: "suggestion",
          status: "ok",
        },
        {
          cached: false,
          cost_cents: 0,
          reason: "cost_limit",
          returned: 0,
          source: "idea",
          status: "skipped",
        },
      ],
      total_count: 0,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const result = await client.researchKeywords("prj 1", {
      estimateOnly: true,
      maxCostCents: 2,
      seed: "rank tracker",
    });

    expect(result).toEqual(body);
    expect(result.estimate).toBe(true);
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/projects/prj%201/keyword-research?estimate_only=true&max_cost_cents=2&seed=rank+tracker",
    );
  });

  it("gets keyword metrics with an API-shaped body and cached response counts", async () => {
    const body: KeywordMetricsResponse = {
      cached_count: 1,
      connections: [{ id: "conn_1", label: "DataForSEO", provider: "dataforseo" }],
      cost_cents: 2,
      fetched_at: "2026-07-22T10:00:00.000Z",
      fetched_count: 1,
      provider: "DataForSEO",
      rows: [
        {
          competition: 0.42,
          cpc_cents: null,
          difficulty: 37,
          intent: "commercial",
          keyword: "rank tracker",
          monthly_trend: [],
          search_volume: null,
        },
      ],
      total_count: 1,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const result = await client.getKeywordMetrics("prj 1", {
      connection_id: "conn 1",
      estimate_only: false,
      fresh: true,
      include_clickstream: true,
      keywords: ["rank tracker", "seo api"],
      max_cost_cents: 5,
    });

    expect(result).toEqual(body);
    expect(result).toMatchObject({ cached_count: 1, fetched_count: 1 });
    expect(result.rows[0]).toMatchObject({ cpc_cents: null, search_volume: null });
    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/projects/prj%201/keyword-metrics");
    expect(call.init?.method).toBe("POST");
    expectJsonBody(call.init, {
      connection_id: "conn 1",
      estimate_only: false,
      fresh: true,
      include_clickstream: true,
      keywords: ["rank tracker", "seo api"],
      max_cost_cents: 5,
    });
  });

  it("maps a cache-aware keyword metrics estimate", async () => {
    const body: KeywordMetricsResponse = {
      cached_count: 1,
      connections: [{ id: "conn_1", label: "DataForSEO", provider: "dataforseo" }],
      cost_cents: 0,
      estimate: true,
      estimated_cost_cents: 1.01,
      fetched_at: "2026-07-22T10:00:00.000Z",
      fetched_count: 0,
      fetched_count_estimate: 2,
      provider: "DataForSEO",
      rows: [],
      total_count: 0,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    const result = await client.getKeywordMetrics("prj 1", {
      estimate_only: true,
      keywords: ["rank tracker", "seo api", "keyword api"],
      max_cost_cents: 2,
    });

    expect(result).toEqual(body);
    expect(result).toMatchObject({
      estimate: true,
      estimated_cost_cents: 1.01,
      fetched_count_estimate: 2,
    });
    const call = lastCall(fetchMock);
    expectJsonBody(call.init, {
      estimate_only: true,
      keywords: ["rank tracker", "seo api", "keyword api"],
      max_cost_cents: 2,
    });
  });

  it("exports rank history as paginated JSON or raw CSV", async () => {
    const body: RankHistoryExportResponse = {
      data: [
        {
          checked_at: "2026-07-21T10:00:00.000Z",
          id: "check_1",
          keyword: "rank tracker api",
          keyword_id: "kw 1",
          position: 4,
          previous_position: null,
          ranking_url: "https://example.com/rank-tracker",
        },
      ],
      meta: { next_cursor: "cursor_2" },
    };
    const csv = "keyword,position\nrank tracker api,4\n";
    fetchMock.mockResolvedValueOnce(jsonResponse(body));
    fetchMock.mockResolvedValueOnce(
      new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } }),
    );

    const jsonResult = await client.exportRankHistory("prj 1", {
      cursor: "cursor 1",
      format: "json",
      granularity: "weekly",
      keywordIds: ["kw 1", "kw/2"],
      limit: 25,
      range: "90",
    });
    const csvResult = await client.exportRankHistory("prj_1", {
      format: "csv",
      granularity: "daily",
      keywordIds: ["kw_1"],
      range: "all",
    });

    expect(jsonResult).toEqual(body);
    expect(jsonResult.data[0]?.previous_position).toBeNull();
    expect(csvResult).toBe(csv);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/exports/rank-history?cursor=cursor+1&format=json&granularity=weekly&keyword_id=kw+1&keyword_id=kw%2F2&limit=25&range=90",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/exports/rank-history?format=csv&granularity=daily&keyword_id=kw_1&range=all",
    );
  });

  it("iterates every JSON rank-history export page", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            checked_at: "2026-07-21T10:00:00.000Z",
            id: "check_1",
            keyword: "rank tracker api",
            keyword_id: "kw_1",
            position: 4,
            previous_position: 6,
            ranking_url: null,
          },
        ],
        meta: { next_cursor: "cursor_2" },
      } satisfies RankHistoryExportResponse),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            checked_at: "2026-07-20T10:00:00.000Z",
            id: "check_2",
            keyword: "rank tracker api",
            keyword_id: "kw_1",
            position: 6,
            previous_position: 8,
            ranking_url: "https://example.com/older",
          },
        ],
        meta: { next_cursor: null },
      } satisfies RankHistoryExportResponse),
    );

    const rows = [];
    for await (const row of client.iterateRankHistoryExport("prj_1", {
      granularity: "daily",
      keywordIds: ["kw_1"],
      limit: 1,
      range: "30",
    })) {
      rows.push(row);
    }

    expect(rows.map((row) => row.id)).toEqual(["check_1", "check_2"]);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://api.test/api/v1/projects/prj_1/exports/rank-history?format=json&granularity=daily&keyword_id=kw_1&limit=1&range=30",
      "https://api.test/api/v1/projects/prj_1/exports/rank-history?cursor=cursor_2&format=json&granularity=daily&keyword_id=kw_1&limit=1&range=30",
    ]);
  });

  it("lists and updates sitemap monitors", async () => {
    const monitors: SitemapMonitorListResponse = {
      data: [
        {
          enabled: true,
          id: "prj_1",
          latest_snapshot: {
            fetched_at: "2026-07-22T09:00:00.000Z",
            id: "snapshot_1",
            sitemap_url: "https://example.com/sitemap.xml",
            url_count: 42,
          },
          project_id: "prj_1",
          sitemap_url: "https://example.com/sitemap.xml",
          status: "active",
        },
      ],
      meta: { next_cursor: null },
    };
    const updated = { ...monitors.data[0], enabled: false, status: "disabled" as const };
    fetchMock.mockResolvedValueOnce(jsonResponse(monitors));
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));

    await expect(client.listSitemapMonitors("prj 1")).resolves.toEqual(monitors);
    await expect(
      client.updateSitemapMonitor("prj 1", "monitor 1", { enabled: false }),
    ).resolves.toEqual(updated);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/sitemap-monitors",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/sitemap-monitors/monitor%201",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { enabled: false });
  });

  it("creates keywords through addKeywords", async () => {
    const response: CreateKeywordsResponse = {
      created: 1,
      results: [{ keyword: keyword({ id: "kw_new" }), status: "created" }],
      skipped: 0,
    };
    const item = {
      keyword: "rank tracker",
      schedule: {
        cron_expression: null,
        frequency: "daily",
      },
      tags: ["Product"],
      target_url: "https://example.com/page",
    } as const;
    const body = { keywords: [item] };
    fetchMock.mockResolvedValueOnce(jsonResponse(response, { status: 201 }));

    await expect(
      client.addKeywords("prj_1", body, { idempotencyKey: "idem_keywords" }),
    ).resolves.toEqual(response);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/keywords");
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_keywords",
    );
    expectJsonBody(fetchMock.mock.calls[0]?.[1], body);
  });

  it("sends location, intent, and topic fields and surfaces creation warnings", async () => {
    const warning = 'City "Springfield" not found; tracking at country level.';
    const response: CreateKeywordsResponse = {
      created: 1,
      results: [
        {
          keyword: keyword({ id: "kw_new", intent: "commercial", topic: "tracking" }),
          status: "created",
          warning,
        },
      ],
      skipped: 0,
      warnings: [warning],
    };
    const input = {
      city: "Springfield",
      country: "United States",
      intent: "commercial",
      keyword: "rank tracker",
      location_key: "US/Texas/Austin",
      topic: "tracking",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(response, { status: 201 }));

    await expect(client.addKeywords("prj_1", input)).resolves.toEqual(response);

    expectJsonBody(lastCall(fetchMock).init, input);
  });

  it("updates keyword location, intent, and topic fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword({ intent: "informational" })));

    await expect(
      client.updateKeyword("kw_1", {
        city: null,
        intent: "informational",
        location_key: "US",
        topic: null,
      }),
    ).resolves.toMatchObject({ intent: "informational" });

    expectJsonBody(lastCall(fetchMock).init, {
      city: null,
      intent: "informational",
      location_key: "US",
      topic: null,
    });
  });

  it("gets, updates, sets target URL, and deletes a keyword", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword()));
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword({ text: "new text" })));
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword({ target_url: null })));
    fetchMock.mockResolvedValueOnce(jsonResponse(keyword()));

    await expect(client.getKeyword("kw_1")).resolves.toMatchObject({ id: "kw_1" });
    await expect(
      client.updateKeyword("kw_1", { keyword: "new text", tags: ["API"] }),
    ).resolves.toMatchObject({
      text: "new text",
    });
    await expect(client.setKeywordTargetUrl("kw_1", null)).resolves.toMatchObject({
      target_url: null,
    });
    await expect(client.deleteKeyword("kw_1")).resolves.toMatchObject({ id: "kw_1" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/keywords/kw_1");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { keyword: "new text", tags: ["API"] });
    expectJsonBody(fetchMock.mock.calls[2]?.[1], { target_url: null });
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
  });

  it("bulk updates keywords", async () => {
    const response: KeywordBulkResponse = {
      operation: "add_tags",
      results: [{ keyword_id: "kw_1", status: "updated" }],
    };
    const input = { keyword_ids: ["kw_1"], operation: "add_tags", tags: ["Product"] } as const;
    fetchMock.mockResolvedValueOnce(jsonResponse(response));

    await expect(client.bulkUpdateKeywords(input)).resolves.toEqual(response);

    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/keywords/bulk");
    expect(lastCall(fetchMock).init?.method).toBe("POST");
    expectJsonBody(lastCall(fetchMock).init, input);
  });

  it("lists, runs, and gets rank checks", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    const until = "2026-01-31T00:00:00.000Z";
    fetchMock.mockResolvedValueOnce(jsonResponse(list([rankCheck()], "cursor_2")));
    fetchMock.mockResolvedValueOnce(jsonResponse(rankCheck(), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(rankCheck({ id: "check_2" })));

    await expect(
      client.listRankChecks("kw_1", {
        cursor: "cursor_1",
        limit: 5,
        since,
        status: "failed",
        until,
      }),
    ).resolves.toMatchObject({ meta: { next_cursor: "cursor_2" } });
    await expect(client.runRankCheck("kw_1", { provider_id: "dataforseo" })).resolves.toMatchObject(
      {
        id: "check_1",
      },
    );
    await expect(client.getRankCheckResult("check_2")).resolves.toMatchObject({ id: "check_2" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/keywords/kw_1/rank-checks?cursor=cursor_1&limit=5&since=2026-01-01T00%3A00%3A00.000Z&status=failed&until=2026-01-31T00%3A00%3A00.000Z",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/keywords/kw_1/checks");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { provider_id: "dataforseo" });
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.test/api/v1/rank-checks/check_2");
  });

  it("omits the body for a rank check without provider input", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rankCheck(), { status: 201 }));

    await client.runRankCheck("kw_1");

    expect(lastCall(fetchMock).init?.body).toBeUndefined();
    expect(lastCall(fetchMock).headers.has("Content-Type")).toBe(false);
  });

  it("runs a rank check asynchronously with the async query parameter", async () => {
    const running = rankCheck({ checked_at: "2026-01-06T00:00:00.000Z", status: "running" });
    fetchMock.mockResolvedValueOnce(jsonResponse(running, { status: 202 }));

    await expect(
      client.runRankCheck(
        "kw_1",
        { provider_id: "dataforseo" },
        { async: true, idempotencyKey: "idem_async" },
      ),
    ).resolves.toMatchObject({ status: "running" });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/keywords/kw_1/checks?async=true");
    expect(call.init?.method).toBe("POST");
    expect(call.headers.get("Idempotency-Key")).toBe("idem_async");
    expectJsonBody(call.init, { provider_id: "dataforseo" });
  });

  it("omits the async query parameter when async is false", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rankCheck(), { status: 201 }));

    await client.runRankCheck("kw_1", undefined, { async: false });

    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/keywords/kw_1/checks");
  });

  it("exposes failed rank checks with provider fallback attempts", async () => {
    const failed = rankCheck({
      attempts: [
        { message: "Quota exceeded.", provider: "dataforseo" },
        { message: "Timed out.", provider: "serpapi" },
      ],
      error: "Rank check failed.",
      position: null,
      status: "failed",
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(list([failed])));

    const result = await client.listRankChecks("kw_1", { status: "running" });

    expect(result.data[0]?.attempts).toHaveLength(2);
    expect(result.data[0]?.status).toBe("failed");
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/keywords/kw_1/rank-checks?status=running",
    );
  });

  it("creates a signal for the API key project", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(signal(), { status: 201 }));

    const input = {
      happened_at: "2026-07-04T19:30:00.000Z",
      keyword_id: "kw_1",
      payload: { version: "1.2.3" },
      severity: "warning",
      source: "deploy",
      type: "deploy.completed",
      url: "https://example.com/releases/1",
    } as const;
    await expect(
      client.createSignal(input, { idempotencyKey: "idem_signal" }),
    ).resolves.toMatchObject({
      id: "sig_1",
      keyword_id: "kw_1",
      project_id: "prj_1",
      public_id: "sig_1",
    });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/signals");
    expect(call.init?.method).toBe("POST");
    expect(call.headers.get("Authorization")).toBe(`Bearer ${apiKey}`);
    expect(call.headers.get("Idempotency-Key")).toBe("idem_signal");
    expectJsonBody(call.init, input);
  });

  it("creates a minimal signal with only source and type", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        signal({ keyword_id: null, payload: null, severity: "info", source: "api", url: null }),
        { status: 201 },
      ),
    );

    const created = await client.createSignal({ source: "api", type: "api.changed" });

    expect(created).toMatchObject({ severity: "info", source: "api" });
    expect(created.keyword_id).toBeNull();
    expect(created.payload).toBeNull();
    expectJsonBody(lastCall(fetchMock).init, { source: "api", type: "api.changed" });
  });

  it("lists project signals with all supported filters", async () => {
    const signalList = list([signal({ id: "sig_2", public_id: "sig_2" })], "signal_cursor");
    fetchMock.mockResolvedValueOnce(jsonResponse(signalList));

    const result = await client.listSignals("prj 1", {
      cursor: "cursor_1",
      from: new Date("2026-07-01T00:00:00.000Z"),
      limit: 1,
      source: "deploy",
      to: "2026-07-05T00:00:00.000Z",
      type: "deploy.completed",
    });

    expect(result).toEqual(signalList);
    expect(lastCall(fetchMock).url).toBe(
      "https://api.test/api/v1/projects/prj%201/signals?cursor=cursor_1&from=2026-07-01T00%3A00%3A00.000Z&limit=1&source=deploy&to=2026-07-05T00%3A00%3A00.000Z&type=deploy.completed",
    );
    expect(lastCall(fetchMock).init?.method).toBe("GET");
  });

  it("lists project signals without query parameters when no options are passed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([signal()])));

    await client.listSignals("prj_1");

    expect(lastCall(fetchMock).url).toBe("https://api.test/api/v1/projects/prj_1/signals");
  });

  it("reads traffic analytics and triggers an idempotent sync", async () => {
    const traffic: PageTrafficSnapshotsResponse = {
      offset: 20,
      rows: [
        {
          bounce_rate: 0.31,
          created_at: "2026-07-22T10:00:00.000Z",
          date: "2026-07-21",
          engagement_rate: 0.69,
          id: "traffic_1",
          key_events: 3,
          path: "/pricing",
          project_id: "prj_1",
          provider: "ga4",
          scroll_depth: 0.72,
          sessions: 42,
          updated_at: "2026-07-22T10:00:00.000Z",
          visit_duration_seconds: 88.5,
          visitors: 37,
          window_days: 1,
        },
      ],
      total_count: 81,
    };
    const queryStats: SearchPerformanceQueryStatsResponse = {
      connection: { id: "conn_gsc", label: "Search Console", provider: "gsc" },
      rows: [
        {
          clicks: 14,
          ctr: 0.125,
          impressions: 112,
          page: "/pricing",
          position: 4.2,
          query: "rank tracker api",
        },
      ],
    };
    const sync: TrafficSyncSummary = {
      connections: 2,
      keyword_snapshots: 11,
      page_snapshots: 8,
      project_id: "prj_1",
      runs: [
        {
          connection_id: "conn_ga4",
          provider: "ga4",
          rows_fetched: 8,
          rows_matched: 8,
          rows_upserted: 8,
          status: "succeeded_with_data",
          truncated: false,
        },
      ],
      skipped: [{ provider: "plausible", reason: "no_capability" }],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(traffic));
    fetchMock.mockResolvedValueOnce(jsonResponse(queryStats));
    fetchMock.mockResolvedValueOnce(jsonResponse(sync));

    await expect(
      client.listTrafficSnapshots("prj_1", {
        endDate: "2026-06-30",
        limit: 20,
        offset: 20,
        paths: ["/pricing", "/docs"],
        startDate: "2026-06-01",
      }),
    ).resolves.toEqual(traffic);
    await expect(
      client.listSearchPerformanceQueryStats("prj_1", {
        connectionId: "conn gsc",
        endDate: "2026-06-30",
        limit: 100,
        query: "rank tracker",
        startDate: "2026-06-01",
      }),
    ).resolves.toEqual(queryStats);
    await expect(
      client.syncProjectTraffic("prj_1", { idempotencyKey: "analytics-sync-001" }),
    ).resolves.toEqual(sync);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/analytics/traffic-snapshots?end_date=2026-06-30&limit=20&offset=20&path=%2Fpricing&path=%2Fdocs&start_date=2026-06-01",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/analytics/query-stats?connection_id=conn+gsc&end_date=2026-06-30&limit=100&query=rank+tracker&start_date=2026-06-01",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "analytics-sync-001",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBeUndefined();
  });

  it("lists, creates, updates, deletes alert rules, and lists triggered alerts", async () => {
    const ruleList = list([alertRule()], "cursor_2");
    const triggeredList = list([triggeredAlert()]);
    fetchMock.mockResolvedValueOnce(jsonResponse(ruleList));
    fetchMock.mockResolvedValueOnce(jsonResponse(triggeredList));
    fetchMock.mockResolvedValueOnce(jsonResponse(alertRule({ id: "rule_new" }), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(alertRule({ threshold_position: 9 })));
    fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: true }));

    await expect(client.listAlertRules("prj 1", { cursor: "cursor 1", limit: 1 })).resolves.toEqual(
      ruleList,
    );
    await expect(client.listTriggeredAlerts("prj_1")).resolves.toEqual(triggeredList);
    await expect(
      client.createAlertRule(
        "prj_1",
        {
          channels: ["email", "webhook"],
          condition_type: "threshold",
          name: "Ranking drop",
          target_type: "all",
          threshold_position: 10,
        },
        { idempotencyKey: "idem_alert" },
      ),
    ).resolves.toMatchObject({ id: "rule_new" });
    await expect(
      client.updateAlertRule("rule 1", {
        condition_type: "threshold",
        enabled: false,
        name: "Ranking drop",
        threshold_position: 9,
      }),
    ).resolves.toMatchObject({ threshold_position: 9 });
    await expect(client.deleteAlertRule("rule 1")).resolves.toEqual({ deleted: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/alert-rules?cursor=cursor+1&limit=1",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/triggered-alerts",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/alert-rules");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_alert",
    );
    expectJsonBody(fetchMock.mock.calls[2]?.[1], {
      channels: ["email", "webhook"],
      condition_type: "threshold",
      name: "Ranking drop",
      target_type: "all",
      threshold_position: 10,
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://api.test/api/v1/alert-rules/rule%201");
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[3]?.[1], {
      condition_type: "threshold",
      enabled: false,
      name: "Ranking drop",
      threshold_position: 9,
    });
    expect(fetchMock.mock.calls[4]?.[0]).toBe("https://api.test/api/v1/alert-rules/rule%201");
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("DELETE");
  });

  it("mutes a triggered alert and marks project alerts read", async () => {
    const muteResult = { muted: true as const, snoozed_until: "2026-07-23T10:00:00.000Z" };
    const readResult = { updated: 3 };
    fetchMock.mockResolvedValueOnce(jsonResponse(muteResult));
    fetchMock.mockResolvedValueOnce(jsonResponse(readResult));

    await expect(client.muteTriggeredAlert("prj 1", "alert 1")).resolves.toEqual(muteResult);
    await expect(client.markProjectAlertsRead("prj 1")).resolves.toEqual(readResult);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/triggered-alerts/alert%201/mute",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/triggered-alerts/mark-read",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined();
  });

  it("lists team members and manages team invites through scoped and top-level routes", async () => {
    const created: CreatedTeamInvite = {
      expires_at: "2026-01-14T00:00:00.000Z",
      id: "inv_2",
      invite_link: "https://bisibility.test/invite/raw",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(list([teamMember()], "member_cursor")));
    fetchMock.mockResolvedValueOnce(jsonResponse(list([teamInvite()], "invite_cursor")));
    fetchMock.mockResolvedValueOnce(jsonResponse(created, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "inv_1" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "inv_2" }));

    await expect(client.listTeamMembers("prj_1", { limit: 10 })).resolves.toMatchObject({
      meta: { next_cursor: "member_cursor" },
    });
    await expect(
      client.listTeamInvites("prj_1", { cursor: "invite cursor", limit: 5 }),
    ).resolves.toMatchObject({
      meta: { next_cursor: "invite_cursor" },
    });
    await expect(
      client.createTeamInvite("prj_1", { email: "new@example.com", role: "viewer" }),
    ).resolves.toEqual(created);
    await expect(client.revokeTeamInvite("prj_1", "inv_1")).resolves.toEqual({ id: "inv_1" });
    await expect(client.revokeTeamInviteById("inv 2")).resolves.toEqual({ id: "inv_2" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/team/members?limit=10",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/team/invites?cursor=invite+cursor&limit=5",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/team/invites",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expectJsonBody(fetchMock.mock.calls[2]?.[1], {
      email: "new@example.com",
      role: "viewer",
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/team/invites/inv_1",
    );
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[4]?.[0]).toBe("https://api.test/api/v1/team/invites/inv%202");
  });

  it("updates and removes team members and resends invites", async () => {
    const resent = {
      expires_at: "2026-07-29T10:00:00.000Z",
      id: "inv_1",
      invite_link: "https://bisibility.test/invite/new-token",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "mem_1", role: "admin" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "mem_1" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(resent));

    await expect(client.updateTeamMemberRole("prj 1", "mem 1", { role: "admin" })).resolves.toEqual(
      { id: "mem_1", role: "admin" },
    );
    await expect(client.removeTeamMember("prj 1", "mem 1")).resolves.toEqual({ id: "mem_1" });
    await expect(client.resendTeamInvite("prj 1", "inv 1")).resolves.toEqual(resent);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/team/members/mem%201",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[0]?.[1], { role: "admin" });
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj%201/team/invites/inv%201/resend",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
  });

  it("lists providers and manages provider connections", async () => {
    const testResult: ProviderTestResult = { balance: 15.25, message: "Connected", ok: true };
    fetchMock.mockResolvedValueOnce(jsonResponse(list([provider()], "provider_cursor")));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection(), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(testResult));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ enabled: false })));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ enabled: true })));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ enabled: true })));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ enabled: false })));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ priority: 20 })));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection({ is_primary: true })));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse(providerConnection(), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Skipped", ok: true }));

    await expect(
      client.listProviders("prj_1", { cursor: "provider cursor", limit: 20 }),
    ).resolves.toMatchObject({
      meta: { next_cursor: "provider_cursor" },
    });
    await expect(
      client.connectProvider(
        "prj_1",
        "serpapi",
        {
          cost_per_check: 0.01,
          credentials: { api_key: "secret" },
          primary: true,
          priority: 0,
        },
        { idempotencyKey: "idem_provider" },
      ),
    ).resolves.toMatchObject({ id: "pc_1" });
    await expect(
      client.testProviderConnection("prj_1", "serpapi", {
        credentials: { api_key: "secret" },
      }),
    ).resolves.toEqual(testResult);
    await expect(
      client.updateProviderSettings("prj_1", "serpapi", { enabled: false, priority: 25 }),
    ).resolves.toMatchObject({ enabled: false });
    await expect(client.setProviderEnabled("prj_1", "serpapi", true)).resolves.toMatchObject({
      enabled: true,
    });
    await expect(client.enableProvider("prj_1", "serpapi")).resolves.toMatchObject({
      enabled: true,
    });
    await expect(client.disableProvider("prj_1", "serpapi")).resolves.toMatchObject({
      enabled: false,
    });
    await expect(client.setProviderPriority("prj_1", "serpapi", 20)).resolves.toMatchObject({
      priority: 20,
    });
    await expect(client.setPrimaryProvider("prj_1", "serpapi")).resolves.toMatchObject({
      is_primary: true,
    });
    await expect(client.disconnectProvider("prj_1", "serpapi")).resolves.toEqual({ ok: true });
    await expect(client.connectProvider("prj_1", "serpapi")).resolves.toMatchObject({ id: "pc_1" });
    await expect(client.testProviderConnection("prj_1", "serpapi")).resolves.toMatchObject({
      ok: true,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers?cursor=provider+cursor&limit=20",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers/serpapi/connect",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_provider",
    );
    expectJsonBody(fetchMock.mock.calls[1]?.[1], {
      cost_per_check: 0.01,
      credentials: { api_key: "secret" },
      primary: true,
      priority: 0,
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers/serpapi/test",
    );
    expectJsonBody(fetchMock.mock.calls[2]?.[1], { credentials: { api_key: "secret" } });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers/serpapi",
    );
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[3]?.[1], { enabled: false, priority: 25 });
    expectJsonBody(fetchMock.mock.calls[4]?.[1], { enabled: true });
    expectJsonBody(fetchMock.mock.calls[5]?.[1], { enabled: true });
    expectJsonBody(fetchMock.mock.calls[6]?.[1], { enabled: false });
    expectJsonBody(fetchMock.mock.calls[7]?.[1], { priority: 20 });
    expectJsonBody(fetchMock.mock.calls[8]?.[1], { primary: true });
    expect(fetchMock.mock.calls[9]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[10]?.[1]?.body).toBeUndefined();
    expect(new Headers(fetchMock.mock.calls[10]?.[1]?.headers).has("Content-Type")).toBe(false);
    expect(fetchMock.mock.calls[11]?.[1]?.body).toBeUndefined();
    expect(new Headers(fetchMock.mock.calls[11]?.[1]?.headers).has("Content-Type")).toBe(false);
  });

  it("connects and tests a plausible provider with endpoint credentials", async () => {
    const connection = providerConnection({ kind: "analytics", provider: "plausible" });
    fetchMock.mockResolvedValueOnce(jsonResponse(connection, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Connected", ok: true }));

    const credentials = {
      api_key: "plausible-key",
      endpoint: "https://plausible.example.com",
    } as const;
    await expect(
      client.connectProvider("prj_1", "plausible", { credentials, primary: false }),
    ).resolves.toMatchObject({ kind: "analytics", provider: "plausible" });
    await expect(
      client.testProviderConnection("prj_1", "plausible", { credentials }),
    ).resolves.toEqual({ message: "Connected", ok: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers/plausible/connect",
    );
    expectJsonBody(fetchMock.mock.calls[0]?.[1], { credentials, primary: false });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/providers/plausible/test",
    );
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { credentials });
  });

  it("lists, creates, and deletes saved views through scoped and top-level routes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([savedView()], "view_cursor")));
    fetchMock.mockResolvedValueOnce(jsonResponse(savedView({ id: "view_new" }), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: false }));

    await expect(
      client.listSavedViews("prj_1", { cursor: "view cursor", limit: 2 }),
    ).resolves.toMatchObject({
      meta: { next_cursor: "view_cursor" },
    });
    await expect(
      client.createSavedView("prj_1", {
        config: savedViewConfig,
        name: "Product keywords",
      }),
    ).resolves.toMatchObject({ id: "view_new" });
    await expect(client.deleteSavedView("prj_1", "view_1")).resolves.toEqual({ deleted: true });
    await expect(client.deleteSavedViewById("view top")).resolves.toEqual({ deleted: false });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/saved-views?cursor=view+cursor&limit=2",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/saved-views");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], {
      config: savedViewConfig,
      name: "Product keywords",
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/saved-views/view_1",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://api.test/api/v1/saved-views/view%20top");
  });

  it("lists, adds, and removes competitors through scoped and top-level routes", async () => {
    const competitorList: CompetitorListResponse = {
      data: [competitor()],
      meta: {
        markets: [
          {
            checked_keyword_count: 10,
            columns: [{ domain: "example.com", kind: "You", label: "You" }],
            competitor_count: 1,
            country: "us",
            device: "desktop",
            engine: "google",
            has_rank_data: true,
            key: "us-desktop",
            rows: [{ gap: 2, keyword: "rank tracker", ranks: { comp_1: 2, you: 4 } }],
            shares: [
              {
                color: "#111",
                domain: "rankzly.io",
                id: "comp_1",
                initials: "R",
                kind: "Managed",
                label: "Rankzly",
                share_of_voice: 0.25,
                shared_keywords: 4,
              },
            ],
            shared_keyword_count: 4,
            tracked_keyword_count: 10,
          },
        ],
        next_cursor: "competitor_cursor",
        suggestions: [{ domain: "search.example", initials: "S", overlap: 3 }],
      },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(competitorList));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...competitor({ label: null }), initials: undefined }, { status: 201 }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ removed: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ removed: true }));

    await expect(
      client.listCompetitors("prj_1", { cursor: "competitor cursor", limit: 25 }),
    ).resolves.toEqual(competitorList);
    await expect(
      client.addCompetitor("prj_1", { domain: "https://rankzly.io" }),
    ).resolves.toMatchObject({
      domain: "rankzly.io",
    });
    await expect(client.removeCompetitor("prj_1", "comp_1")).resolves.toEqual({ removed: true });
    await expect(client.removeCompetitorById("comp top")).resolves.toEqual({ removed: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/competitors?cursor=competitor+cursor&limit=25",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/competitors");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], { domain: "https://rankzly.io" });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/competitors/comp_1",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://api.test/api/v1/competitors/comp%20top");
  });

  it("gets and updates notification preferences", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(notificationPreferences()));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(notificationPreferences({ alert_email: false, alert_slack: true })),
    );

    await expect(client.getNotificationPreferences("prj_1")).resolves.toMatchObject({
      alert_email: true,
      email: "owner@example.com",
    });
    await expect(
      client.updateNotificationPreferences("prj_1", {
        alert_email: false,
        alert_slack: true,
      }),
    ).resolves.toMatchObject({ alert_email: false, alert_slack: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/notification-preferences",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/notification-preferences",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expectJsonBody(fetchMock.mock.calls[1]?.[1], {
      alert_email: false,
      alert_slack: true,
    });
  });

  it("lists, mints, and revokes migration tokens through scoped and top-level routes", async () => {
    const tokenList: MigrationTokenListResponse = {
      data: [activeMigrationToken()],
      meta: { import_job: migrationJob(), next_cursor: null },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(tokenList));
    fetchMock.mockResolvedValueOnce(jsonResponse(issuedMigrationToken(), { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(issuedMigrationToken({ scope: "keywords" })));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "tok_1", revoked_at: "2026-01-08T00:30:00.000Z" }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "tok_2", revoked_at: "2026-01-08T00:45:00.000Z" }),
    );

    await expect(client.listMigrationTokens("prj_1", { limit: 1 })).resolves.toEqual(tokenList);
    await expect(client.mintMigrationToken("prj_1")).resolves.toMatchObject({
      token: "mig_secret",
    });
    await expect(
      client.mintMigrationToken("prj_1", { scope: "keywords" }, { idempotencyKey: "idem_mig" }),
    ).resolves.toMatchObject({ scope: "keywords" });
    await expect(client.revokeMigrationToken("prj_1", "tok_1")).resolves.toMatchObject({
      id: "tok_1",
    });
    await expect(client.revokeMigrationTokenById("tok top")).resolves.toMatchObject({
      id: "tok_2",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/migration-tokens?limit=1",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/migration-tokens",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined();
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).has("Content-Type")).toBe(false);
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "idem_mig",
    );
    expectJsonBody(fetchMock.mock.calls[2]?.[1], { scope: "keywords" });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/migration-tokens/tok_1",
    );
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[4]?.[0]).toBe("https://api.test/api/v1/migration-tokens/tok%20top");
  });

  it("omits pagination query parameters for new list methods when no options are passed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(list([provider()])));
    fetchMock.mockResolvedValueOnce(jsonResponse(list([savedView()])));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [competitor()],
        meta: { markets: [], next_cursor: null, suggestions: [] },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [activeMigrationToken()],
        meta: { import_job: migrationJob(), next_cursor: null },
      }),
    );

    await client.listProviders("prj_1");
    await client.listSavedViews("prj_1");
    await client.listCompetitors("prj_1");
    await client.listMigrationTokens("prj_1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/providers");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/saved-views");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.test/api/v1/projects/prj_1/competitors");
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.test/api/v1/projects/prj_1/migration-tokens",
    );
  });

  it("checks cloud import compatibility without requiring an API key", async () => {
    const compatibility: CloudImportCompatibility = {
      app_version: "2026.07.01",
      latest_migration: "2026_07_01_000000",
      schema_versions_supported: [1, 2, 3],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(compatibility));

    const anonymous = new BisibilityClient({
      baseUrl: "https://api.test/api/v1",
      fetch: fetchMock,
    });
    await expect(anonymous.getCloudImportCompatibility()).resolves.toEqual(compatibility);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/cloud/import/compatibility");
    expect(call.init?.method).toBe("GET");
    expect(call.headers.has("Authorization")).toBe(false);
  });

  it("imports a cloud export package with a migration token", async () => {
    const finalized: CloudImportFinalizeResponse = {
      counts: { competitors: 2, keywords: 5 },
      job_id: "job_1",
      state: "done",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(finalized, { status: 201 }));

    const migrationClient = createClient(fetchMock, { apiKey: "mig_secret" });
    await expect(
      migrationClient.importCloudExport({
        competitors: [{ domain: "rival.com", label: "Rival" }],
        keywords: [{ keyword: "seo tools", location: "United States" }],
        scope: "current",
        version: 3,
      }),
    ).resolves.toEqual(finalized);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.test/api/v1/cloud/import");
    expect(call.init?.method).toBe("POST");
    expect(call.headers.get("Authorization")).toBe("Bearer mig_secret");
    expectJsonBody(call.init, {
      competitors: [{ domain: "rival.com", label: "Rival" }],
      keywords: [{ keyword: "seo tools", location: "United States" }],
      scope: "current",
      version: 3,
    });
  });

  it("creates, uploads to, and finalizes a chunked cloud import session", async () => {
    const created: CloudImportSessionCreateResponse = {
      chunk_limits: { max_body_bytes: 1_048_576, max_history_rows: 5000, max_keywords: 500 },
      session_id: "sess_1",
      state: "receiving",
    };
    const chunkAccepted: CloudImportChunkResponse = {
      chunk_count: 2,
      chunks_received: 1,
      state: "receiving",
    };
    const finalized: CloudImportFinalizeResponse = {
      counts: { keywords: 3 },
      job_id: "job_2",
      state: "done",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(created, { status: 201 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(chunkAccepted));
    fetchMock.mockResolvedValueOnce(jsonResponse(finalized));

    const migrationClient = createClient(fetchMock, { apiKey: "mig_secret" });

    await expect(
      migrationClient.createCloudImportSession({
        chunk_count: 2,
        totals: { keywords: 3, rank_checks: 0 },
        version: 3,
      }),
    ).resolves.toEqual(created);

    await expect(
      migrationClient.uploadCloudImportChunk(
        "sess 1",
        0,
        {
          checksum: `sha256:${"a".repeat(64)}`,
          keywords: [{ keyword: "seo tools", location: "United States" }],
          kind: "keywords",
        },
        { contentEncoding: "gzip" },
      ),
    ).resolves.toEqual(chunkAccepted);

    await expect(migrationClient.finalizeCloudImportSession("sess 1")).resolves.toEqual(finalized);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/cloud/import/sessions");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/cloud/import/sessions/sess%201/chunks/0",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PUT");
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Content-Encoding")).toBe("gzip");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://api.test/api/v1/cloud/import/sessions/sess%201/finalize",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBeUndefined();
  });

  it("builds relative URLs for internal paths without a leading slash", () => {
    const relativeClient = createClient(fetchMock, { baseUrl: "/api/v1" });
    const buildUrl = (
      relativeClient as unknown as {
        buildUrl(path: string, query?: Record<string, string>): string;
      }
    ).buildUrl.bind(relativeClient);

    expect(buildUrl("projects", { search: "rank tracker" })).toBe(
      "/api/v1/projects?search=rank+tracker",
    );
  });

  it("returns undefined for an empty successful JSON response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(client.deleteKeyword("kw_1")).resolves.toBeUndefined();
  });
});

describe("BisibilityClient errors", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it("throws a configuration error when a protected method has no API key", async () => {
    const client = new BisibilityClient({ baseUrl: "https://api.test/api/v1", fetch: fetchMock });

    await expect(client.listProjects()).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a configuration error for an empty base URL", () => {
    expect(() => new BisibilityClient({ apiKey, baseUrl: "   ", fetch: fetchMock })).toThrow(
      BisibilityConfigurationError,
    );
  });

  it("throws a configuration error when fetch is unavailable", async () => {
    const originalFetch = globalThis.fetch;
    const client = new BisibilityClient({ apiKey, baseUrl: "https://api.test/api/v1" });

    try {
      vi.stubGlobal("fetch", undefined);
      await expect(client.listProjects()).rejects.toBeInstanceOf(BisibilityConfigurationError);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("throws BisibilityApiError with problem details", async () => {
    const problem = {
      detail: "Keyword not found.",
      docs_url: "https://bisibility.com/docs/api/errors#not_found",
      instance: "urn:bisibility:api:v1:/api/v1/keywords/kw_missing",
      status: 404,
      title: "Not found",
      type: "https://bisibility.dev/problems/not_found",
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(problem, {
        headers: {
          Authorization: "Bearer reflected-secret",
          "Retry-After": "10",
          "Set-Cookie": "session=reflected-secret",
          "X-Api-Key": "reflected-secret",
        },
        status: 404,
      }),
    );

    try {
      await createClient(fetchMock).getKeyword("kw_missing");
      throw new Error("Expected getKeyword to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BisibilityApiError);
      expect(error).toMatchObject({
        message: "Keyword not found.",
        name: "BisibilityApiError",
        problem,
        status: 404,
      });
      expect((error as BisibilityApiError).headers.get("Retry-After")).toBe("10");
      expect((error as BisibilityApiError).headers.has("Authorization")).toBe(false);
      expect((error as BisibilityApiError).headers.has("Set-Cookie")).toBe(false);
      expect((error as BisibilityApiError).headers.has("X-Api-Key")).toBe(false);
    }
  });

  it("parses idempotency conflict problems that omit docs_url and instance", async () => {
    const problem = {
      detail: "A request with this Idempotency-Key is still in progress.",
      status: 409,
      title: "Idempotency key in progress",
      type: "https://bisibility.dev/problems/idempotency_in_progress",
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(problem), {
        headers: { "Content-Type": "application/problem+json", "Retry-After": "1" },
        status: 409,
      }),
    );

    await expect(
      createClient(fetchMock).createApiKey({ name: "CI" }, { idempotencyKey: "idem_1" }),
    ).rejects.toMatchObject({
      message: problem.detail,
      problem,
      status: 409,
    });
  });

  it("parses problems identified by title and status without a type member", async () => {
    const problem = { detail: "Slow down.", status: 429, title: "Too Many Requests" };
    fetchMock.mockResolvedValueOnce(jsonResponse(problem, { status: 429 }));

    await expect(createClient(fetchMock, { maxRetries: 0 }).listProjects()).rejects.toMatchObject({
      message: "Slow down.",
      problem,
      status: 429,
    });
  });

  it("uses the response body as the API error message when problem details are absent", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("upstream unavailable", { status: 502 }));

    await expect(createClient(fetchMock).listProjects()).rejects.toMatchObject({
      body: "upstream unavailable",
      message: "upstream unavailable",
      status: 502,
    });
  });

  it("uses JSON body text when an error response is not problem details", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "not a problem" }, { status: 400 }));

    await expect(createClient(fetchMock).listProjects()).rejects.toMatchObject({
      body: '{"error":"not a problem"}',
      message: '{"error":"not a problem"}',
      problem: undefined,
      status: 400,
    });
  });

  it("falls back to the status message when an error body is empty", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(createClient(fetchMock).listProjects()).rejects.toMatchObject({
      body: "",
      message: "Bisibility API request failed with status 500.",
      status: 500,
    });
  });

  it("keeps malformed JSON error bodies as plain API errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("{", { headers: { "Content-Type": "application/problem+json" }, status: 500 }),
    );

    await expect(createClient(fetchMock).listProjects()).rejects.toMatchObject({
      body: "{",
      message: "{",
      problem: undefined,
      status: 500,
    });
  });

  it("drops problem members with mismatched types instead of passing them through", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: { message: "wrapped" },
          docs_url: 42,
          errors: [{ field: "name" }],
          instance: ["not-a-string"],
          status: 404,
          title: "Not found",
          type: "https://bisibility.dev/problems/not_found",
        },
        { status: 404 },
      ),
    );

    const error = await createClient(fetchMock)
      .listProjects()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BisibilityApiError);
    const problem = (error as BisibilityApiError).problem;
    expect(problem).toMatchObject({
      errors: [{ field: "name" }],
      status: 404,
      title: "Not found",
      type: "https://bisibility.dev/problems/not_found",
    });
    expect(problem?.detail).toBeUndefined();
    expect(problem?.docs_url).toBeUndefined();
    expect(problem?.instance).toBeUndefined();
  });

  it("drops a non-numeric status on a type-identified problem", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: "Broken.",
          status: "500",
          type: "https://bisibility.dev/problems/internal",
        },
        { status: 500 },
      ),
    );

    const error = await createClient(fetchMock)
      .listProjects()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BisibilityApiError);
    const problem = (error as BisibilityApiError).problem;
    expect(problem).toMatchObject({
      detail: "Broken.",
      type: "https://bisibility.dev/problems/internal",
    });
    expect(problem?.status).toBeUndefined();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws a configuration error for invalid timeout %s",
    async (timeout) => {
      await expect(createClient(fetchMock).listProjects({ timeout })).rejects.toBeInstanceOf(
        BisibilityConfigurationError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("throws a configuration error when AbortSignal.timeout is unavailable", async () => {
    const originalTimeout = AbortSignal.timeout;
    const patchable = AbortSignal as unknown as Record<string, unknown>;

    try {
      patchable.timeout = undefined;
      await expect(createClient(fetchMock).listProjects({ timeout: 5 })).rejects.toBeInstanceOf(
        BisibilityConfigurationError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      patchable.timeout = originalTimeout;
    }
  });

  it("aborts the request when the timeout option elapses", async () => {
    const abortingFetch = abortAwareFetch();

    const error = await createClient(abortingFetch, { maxRetries: 0 })
      .listProjects({ timeout: 5 })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BisibilityNetworkError);
    expect((error as BisibilityNetworkError).cause).toMatchObject({ name: "TimeoutError" });
  });

  it("composes the timeout with a user-provided abort signal", async () => {
    const abortingFetch = abortAwareFetch();
    const controller = new AbortController();
    const reason = new Error("user abort");

    const promise = createClient(abortingFetch)
      .listProjects({ signal: controller.signal, timeout: 60_000 })
      .catch((caught: unknown) => caught);
    controller.abort(reason);
    const error = await promise;

    expect(error).toBeInstanceOf(BisibilityNetworkError);
    expect((error as BisibilityNetworkError).cause).toBe(reason);
  });

  it("rejects immediately when the user signal is already aborted", async () => {
    const abortingFetch = abortAwareFetch();
    const controller = new AbortController();
    const reason = new Error("pre-aborted");
    controller.abort(reason);

    const error = await createClient(abortingFetch)
      .listProjects({ signal: controller.signal, timeout: 60_000 })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BisibilityNetworkError);
    expect((error as BisibilityNetworkError).cause).toBe(reason);
  });

  it("wraps network failures", async () => {
    const cause = new Error("socket closed");
    fetchMock.mockRejectedValueOnce(cause);

    await expect(createClient(fetchMock, { maxRetries: 0 }).listProjects()).rejects.toMatchObject({
      cause,
      name: "BisibilityNetworkError",
      url: "https://api.test/api/v1/projects",
    });
  });

  it("throws a response error for invalid success JSON", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("not json", { status: 200 }));

    await expect(createClient(fetchMock).listProjects()).rejects.toBeInstanceOf(
      BisibilityResponseError,
    );
  });

  it("exposes a factory helper", () => {
    expect(createBisibilityClient({ apiKey, fetch: fetchMock })).toBeInstanceOf(BisibilityClient);
  });
});
