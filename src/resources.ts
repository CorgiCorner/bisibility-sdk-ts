import type { BisibilityClient } from "./client.js";
import type {
  ApiKeyId,
  CompetitorId,
  CreateApiKeyInput,
  InviteId,
  MigrationTokenId,
  PaginationOptions,
  ProjectId,
  RequestOptions,
  SavedViewId,
} from "./types.js";

export type ProjectResourceSelector<TId extends string> = TId | { id: TId; projectId?: ProjectId };

export interface ApiKeyListOptions extends PaginationOptions {
  projectId?: ProjectId;
}

export interface ApiKeyCreateScope {
  projectId?: ProjectId;
}

export interface ProjectScope {
  projectId: ProjectId;
}

type ClientMethodName = {
  [K in keyof BisibilityClient]: BisibilityClient[K] extends (...args: never[]) => unknown
    ? K
    : never;
}[keyof BisibilityClient];

const INTERNAL_CLIENT_METHODS = new Set([
  "assertApiVersionCompatible",
  "buildUrl",
  "ensureApiVersionPreflight",
  "errorFromResponse",
  "jsonFromResponse",
  "request",
  "requestOrUndefined",
]);

function delegate<K extends ClientMethodName>(client: BisibilityClient, key: K) {
  return ((...args: unknown[]) => {
    const method = client[key] as unknown as (...values: unknown[]) => unknown;
    return method.apply(client, args);
  }) as unknown as BisibilityClient[K];
}

function compatibilityMethods(client: BisibilityClient) {
  const methods = new Map<string, (...args: unknown[]) => unknown>();
  let prototype: object | null = Object.getPrototypeOf(client) as object;
  while (prototype && prototype !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (name === "constructor" || INTERNAL_CLIENT_METHODS.has(name) || methods.has(name))
        continue;
      const value = Reflect.get(client, name) as unknown;
      if (typeof value === "function") {
        methods.set(name, value.bind(client) as (...args: unknown[]) => unknown);
      }
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }
  return methods;
}

export interface ClientResourceNamespaces {
  readonly system: Readonly<{
    getHealth: BisibilityClient["getHealth"];
    getLiveness: BisibilityClient["getLiveness"];
    getReadiness: BisibilityClient["getReadiness"];
    getCapabilities: BisibilityClient["getCapabilities"];
    getOpenApi: BisibilityClient["getOpenApi"];
    getLlmsText: BisibilityClient["getLlmsText"];
  }>;
  readonly pricing: Readonly<{
    getRates: BisibilityClient["getProviderRates"];
    estimate: BisibilityClient["getCostEstimate"];
  }>;
  readonly locations: Readonly<{
    search: BisibilityClient["searchLocations"];
  }>;
  readonly account: Readonly<{
    get: BisibilityClient["getMe"];
    update: BisibilityClient["updateMe"];
    tokens: Readonly<{
      list: BisibilityClient["listMyTokens"];
      create: BisibilityClient["createMyToken"];
      revoke: BisibilityClient["revokeMyToken"];
    }>;
  }>;
  readonly projects: Readonly<{
    list: BisibilityClient["listProjects"];
    create: BisibilityClient["createProject"];
    get: BisibilityClient["getProject"];
    update: BisibilityClient["updateProject"];
    delete: BisibilityClient["deleteProject"];
    getDefaults: BisibilityClient["getProjectDefaults"];
    updateDefaults: BisibilityClient["updateProjectDefaults"];
  }>;
  readonly apiKeys: Readonly<{
    list: (
      options?: ApiKeyListOptions,
      requestOptions?: RequestOptions,
    ) => ReturnType<BisibilityClient["listApiKeys"]>;
    iterate: (
      options?: ApiKeyListOptions,
      requestOptions?: RequestOptions,
    ) => ReturnType<BisibilityClient["iterateApiKeys"]>;
    create: (
      input: CreateApiKeyInput,
      scope?: ApiKeyCreateScope,
      options?: RequestOptions,
    ) => ReturnType<BisibilityClient["createApiKey"]>;
    revoke: (
      keyId: ApiKeyId,
      options?: RequestOptions,
    ) => ReturnType<BisibilityClient["revokeApiKey"]>;
  }>;
  readonly webhooks: Readonly<{
    list: BisibilityClient["listWebhooks"];
    iterate: BisibilityClient["iterateWebhooks"];
    create: BisibilityClient["createWebhook"];
    update: BisibilityClient["updateWebhook"];
    delete: BisibilityClient["deleteWebhook"];
  }>;
  readonly keywords: Readonly<{
    list: BisibilityClient["listKeywords"];
    iterate: BisibilityClient["iterateKeywords"];
    add: BisibilityClient["addKeywords"];
    get: BisibilityClient["getKeyword"];
    update: BisibilityClient["updateKeyword"];
    setTargetUrl: BisibilityClient["setKeywordTargetUrl"];
    delete: BisibilityClient["deleteKeyword"];
    bulkUpdate: BisibilityClient["bulkUpdateKeywords"];
    match: BisibilityClient["matchProjectKeywords"];
    research: BisibilityClient["researchKeywords"];
    suggestions: Readonly<{
      list: BisibilityClient["listRankedKeywordSuggestions"];
    }>;
    metrics: Readonly<{
      get: BisibilityClient["getKeywordMetrics"];
    }>;
    saved: Readonly<{
      list: BisibilityClient["listSavedKeywords"];
      iterate: BisibilityClient["iterateSavedKeywords"];
      create: BisibilityClient["createSavedKeywords"];
      delete: BisibilityClient["deleteSavedKeyword"];
    }>;
  }>;
  readonly backlinks: Readonly<{
    analyze: BisibilityClient["analyzeBacklinks"];
    extendSnapshot: BisibilityClient["loadMoreBacklinkRows"];
  }>;
  readonly rankChecks: Readonly<{
    list: BisibilityClient["listRankChecks"];
    iterate: BisibilityClient["iterateRankChecks"];
    run: BisibilityClient["runRankCheck"];
    getResult: BisibilityClient["getRankCheckResult"];
    history: Readonly<{
      export: BisibilityClient["exportRankHistory"];
      iterate: BisibilityClient["iterateRankHistoryExport"];
    }>;
  }>;
  readonly sitemapMonitors: Readonly<{
    list: BisibilityClient["listSitemapMonitors"];
    update: BisibilityClient["updateSitemapMonitor"];
  }>;
  readonly signals: Readonly<{
    list: BisibilityClient["listSignals"];
    iterate: BisibilityClient["iterateSignals"];
    create: BisibilityClient["createSignal"];
  }>;
  readonly analytics: Readonly<{
    overview: Readonly<{ get: BisibilityClient["getProjectOverview"] }>;
    traffic: Readonly<{
      list: BisibilityClient["listTrafficSnapshots"];
      sync: BisibilityClient["syncProjectTraffic"];
    }>;
    searchPerformance: Readonly<{
      list: BisibilityClient["listSearchPerformanceQueryStats"];
    }>;
  }>;
  readonly alertRules: Readonly<{
    list: BisibilityClient["listAlertRules"];
    iterate: BisibilityClient["iterateAlertRules"];
    create: BisibilityClient["createAlertRule"];
    update: BisibilityClient["updateAlertRule"];
    delete: BisibilityClient["deleteAlertRule"];
  }>;
  readonly alerts: Readonly<{
    list: BisibilityClient["listTriggeredAlerts"];
    iterate: BisibilityClient["iterateTriggeredAlerts"];
    mute: BisibilityClient["muteTriggeredAlert"];
    markAllRead: (
      scope: ProjectScope,
      options?: RequestOptions,
    ) => ReturnType<BisibilityClient["markProjectAlertsRead"]>;
  }>;
  readonly notificationSettings: Readonly<{
    get: BisibilityClient["getNotificationPreferences"];
    update: BisibilityClient["updateNotificationPreferences"];
  }>;
  readonly team: Readonly<{
    members: Readonly<{
      list: BisibilityClient["listTeamMembers"];
      iterate: BisibilityClient["iterateTeamMembers"];
      updateRole: BisibilityClient["updateTeamMemberRole"];
      remove: BisibilityClient["removeTeamMember"];
    }>;
    invites: Readonly<{
      list: BisibilityClient["listTeamInvites"];
      iterate: BisibilityClient["iterateTeamInvites"];
      create: BisibilityClient["createTeamInvite"];
      resend: BisibilityClient["resendTeamInvite"];
      revoke: (
        selector: ProjectResourceSelector<Parameters<BisibilityClient["revokeTeamInviteById"]>[0]>,
        options?: RequestOptions,
      ) => ReturnType<BisibilityClient["revokeTeamInviteById"]>;
    }>;
  }>;
  readonly providers: Readonly<{
    list: BisibilityClient["listProviders"];
    iterate: BisibilityClient["iterateProviders"];
    connect: BisibilityClient["connectProvider"];
    test: BisibilityClient["testProviderConnection"];
    updateSettings: BisibilityClient["updateProviderSettings"];
    setEnabled: BisibilityClient["setProviderEnabled"];
    setPriority: BisibilityClient["setProviderPriority"];
    setPrimary: BisibilityClient["setPrimaryProvider"];
    disconnect: BisibilityClient["disconnectProvider"];
  }>;
  readonly savedViews: Readonly<{
    list: BisibilityClient["listSavedViews"];
    iterate: BisibilityClient["iterateSavedViews"];
    create: BisibilityClient["createSavedView"];
    delete: (
      selector: ProjectResourceSelector<Parameters<BisibilityClient["deleteSavedViewById"]>[0]>,
      options?: RequestOptions,
    ) => ReturnType<BisibilityClient["deleteSavedViewById"]>;
  }>;
  readonly competitors: Readonly<{
    list: BisibilityClient["listCompetitors"];
    iterate: BisibilityClient["iterateCompetitors"];
    add: BisibilityClient["addCompetitor"];
    remove: (
      selector: ProjectResourceSelector<Parameters<BisibilityClient["removeCompetitorById"]>[0]>,
      options?: RequestOptions,
    ) => ReturnType<BisibilityClient["removeCompetitorById"]>;
  }>;
  readonly imports: Readonly<{
    runFromExport: BisibilityClient["importCloudExport"];
    compatibility: Readonly<{ get: BisibilityClient["getCloudImportCompatibility"] }>;
    tokens: Readonly<{
      list: BisibilityClient["listMigrationTokens"];
      iterate: BisibilityClient["iterateMigrationTokens"];
      create: BisibilityClient["mintMigrationToken"];
      revoke: (
        selector: ProjectResourceSelector<
          Parameters<BisibilityClient["revokeMigrationTokenById"]>[0]
        >,
        options?: RequestOptions,
      ) => ReturnType<BisibilityClient["revokeMigrationTokenById"]>;
    }>;
    sessions: Readonly<{
      create: BisibilityClient["createCloudImportSession"];
      uploadChunk: BisibilityClient["uploadCloudImportChunk"];
      finalize: BisibilityClient["finalizeCloudImportSession"];
    }>;
  }>;
}

function selected<TId extends string>(selector: ProjectResourceSelector<TId>) {
  return typeof selector === "string" ? { id: selector } : selector;
}

export function createResourceNamespaces(client: BisibilityClient): ClientResourceNamespaces {
  const system = Object.freeze({
    getHealth: delegate(client, "getHealth"),
    getLiveness: delegate(client, "getLiveness"),
    getReadiness: delegate(client, "getReadiness"),
    getCapabilities: delegate(client, "getCapabilities"),
    getOpenApi: delegate(client, "getOpenApi"),
    getLlmsText: delegate(client, "getLlmsText"),
  });
  const pricing = Object.freeze({
    getRates: delegate(client, "getProviderRates"),
    estimate: delegate(client, "getCostEstimate"),
  });
  const locations = Object.freeze({ search: delegate(client, "searchLocations") });
  const account = Object.freeze({
    get: delegate(client, "getMe"),
    update: delegate(client, "updateMe"),
    tokens: Object.freeze({
      list: delegate(client, "listMyTokens"),
      create: delegate(client, "createMyToken"),
      revoke: delegate(client, "revokeMyToken"),
    }),
  });
  const projects = Object.freeze({
    list: delegate(client, "listProjects"),
    create: delegate(client, "createProject"),
    get: delegate(client, "getProject"),
    update: delegate(client, "updateProject"),
    delete: delegate(client, "deleteProject"),
    getDefaults: delegate(client, "getProjectDefaults"),
    updateDefaults: delegate(client, "updateProjectDefaults"),
  });
  const apiKeys: ClientResourceNamespaces["apiKeys"] = Object.freeze({
    list: (options?: ApiKeyListOptions, requestOptions?: RequestOptions) => {
      const { projectId, ...pagination } = options ?? {};
      return projectId
        ? client.listProjectApiKeys(projectId, pagination, requestOptions)
        : client.listApiKeys(pagination, requestOptions);
    },
    iterate: (options?: ApiKeyListOptions, requestOptions?: RequestOptions) => {
      const { projectId, ...pagination } = options ?? {};
      return projectId
        ? client.iterateProjectApiKeys(projectId, pagination, requestOptions)
        : client.iterateApiKeys(pagination, requestOptions);
    },
    create: (input, scope?: ApiKeyCreateScope, options?: RequestOptions) =>
      scope?.projectId
        ? client.createProjectApiKey(scope.projectId, input, options)
        : client.createApiKey(input, options),
    revoke: delegate(client, "revokeApiKey"),
  });
  const webhooks = Object.freeze({
    list: delegate(client, "listWebhooks"),
    iterate: delegate(client, "iterateWebhooks"),
    create: delegate(client, "createWebhook"),
    update: delegate(client, "updateWebhook"),
    delete: delegate(client, "deleteWebhook"),
  });
  const keywords = Object.freeze({
    list: delegate(client, "listKeywords"),
    iterate: delegate(client, "iterateKeywords"),
    add: delegate(client, "addKeywords"),
    get: delegate(client, "getKeyword"),
    update: delegate(client, "updateKeyword"),
    setTargetUrl: delegate(client, "setKeywordTargetUrl"),
    delete: delegate(client, "deleteKeyword"),
    bulkUpdate: delegate(client, "bulkUpdateKeywords"),
    match: delegate(client, "matchProjectKeywords"),
    research: delegate(client, "researchKeywords"),
    suggestions: Object.freeze({ list: delegate(client, "listRankedKeywordSuggestions") }),
    metrics: Object.freeze({ get: delegate(client, "getKeywordMetrics") }),
    saved: Object.freeze({
      list: delegate(client, "listSavedKeywords"),
      iterate: delegate(client, "iterateSavedKeywords"),
      create: delegate(client, "createSavedKeywords"),
      delete: delegate(client, "deleteSavedKeyword"),
    }),
  });
  const backlinks = Object.freeze({
    analyze: delegate(client, "analyzeBacklinks"),
    extendSnapshot: delegate(client, "loadMoreBacklinkRows"),
  });
  const rankChecks = Object.freeze({
    list: delegate(client, "listRankChecks"),
    iterate: delegate(client, "iterateRankChecks"),
    run: delegate(client, "runRankCheck"),
    getResult: delegate(client, "getRankCheckResult"),
    history: Object.freeze({
      export: delegate(client, "exportRankHistory"),
      iterate: delegate(client, "iterateRankHistoryExport"),
    }),
  });
  const sitemapMonitors = Object.freeze({
    list: delegate(client, "listSitemapMonitors"),
    update: delegate(client, "updateSitemapMonitor"),
  });
  const signals = Object.freeze({
    list: delegate(client, "listSignals"),
    iterate: delegate(client, "iterateSignals"),
    create: delegate(client, "createSignal"),
  });
  const analytics = Object.freeze({
    overview: Object.freeze({ get: delegate(client, "getProjectOverview") }),
    traffic: Object.freeze({
      list: delegate(client, "listTrafficSnapshots"),
      sync: delegate(client, "syncProjectTraffic"),
    }),
    searchPerformance: Object.freeze({
      list: delegate(client, "listSearchPerformanceQueryStats"),
    }),
  });
  const alertRules = Object.freeze({
    list: delegate(client, "listAlertRules"),
    iterate: delegate(client, "iterateAlertRules"),
    create: delegate(client, "createAlertRule"),
    update: delegate(client, "updateAlertRule"),
    delete: delegate(client, "deleteAlertRule"),
  });
  const alerts: ClientResourceNamespaces["alerts"] = Object.freeze({
    list: delegate(client, "listTriggeredAlerts"),
    iterate: delegate(client, "iterateTriggeredAlerts"),
    mute: delegate(client, "muteTriggeredAlert"),
    markAllRead: ({ projectId }, options) => client.markProjectAlertsRead(projectId, options),
  });
  const notificationSettings = Object.freeze({
    get: delegate(client, "getNotificationPreferences"),
    update: delegate(client, "updateNotificationPreferences"),
  });
  const team: ClientResourceNamespaces["team"] = Object.freeze({
    members: Object.freeze({
      list: delegate(client, "listTeamMembers"),
      iterate: delegate(client, "iterateTeamMembers"),
      updateRole: delegate(client, "updateTeamMemberRole"),
      remove: delegate(client, "removeTeamMember"),
    }),
    invites: Object.freeze({
      list: delegate(client, "listTeamInvites"),
      iterate: delegate(client, "iterateTeamInvites"),
      create: delegate(client, "createTeamInvite"),
      resend: delegate(client, "resendTeamInvite"),
      revoke: (selector: ProjectResourceSelector<InviteId>, options?: RequestOptions) => {
        const { id, projectId } = selected(selector);
        return projectId
          ? client.revokeTeamInvite(projectId, id, options)
          : client.revokeTeamInviteById(id, options);
      },
    }),
  });
  const providers = Object.freeze({
    list: delegate(client, "listProviders"),
    iterate: delegate(client, "iterateProviders"),
    connect: delegate(client, "connectProvider"),
    test: delegate(client, "testProviderConnection"),
    updateSettings: delegate(client, "updateProviderSettings"),
    setEnabled: delegate(client, "setProviderEnabled"),
    setPriority: delegate(client, "setProviderPriority"),
    setPrimary: delegate(client, "setPrimaryProvider"),
    disconnect: delegate(client, "disconnectProvider"),
  });
  const savedViews: ClientResourceNamespaces["savedViews"] = Object.freeze({
    list: delegate(client, "listSavedViews"),
    iterate: delegate(client, "iterateSavedViews"),
    create: delegate(client, "createSavedView"),
    delete: (selector: ProjectResourceSelector<SavedViewId>, options?: RequestOptions) => {
      const { id, projectId } = selected(selector);
      return projectId
        ? client.deleteSavedView(projectId, id, options)
        : client.deleteSavedViewById(id, options);
    },
  });
  const competitors: ClientResourceNamespaces["competitors"] = Object.freeze({
    list: delegate(client, "listCompetitors"),
    iterate: delegate(client, "iterateCompetitors"),
    add: delegate(client, "addCompetitor"),
    remove: (selector: ProjectResourceSelector<CompetitorId>, options?: RequestOptions) => {
      const { id, projectId } = selected(selector);
      return projectId
        ? client.removeCompetitor(projectId, id, options)
        : client.removeCompetitorById(id, options);
    },
  });
  const imports: ClientResourceNamespaces["imports"] = Object.freeze({
    runFromExport: delegate(client, "importCloudExport"),
    compatibility: Object.freeze({ get: delegate(client, "getCloudImportCompatibility") }),
    tokens: Object.freeze({
      list: delegate(client, "listMigrationTokens"),
      iterate: delegate(client, "iterateMigrationTokens"),
      create: delegate(client, "mintMigrationToken"),
      revoke: (selector: ProjectResourceSelector<MigrationTokenId>, options?: RequestOptions) => {
        const { id, projectId } = selected(selector);
        return projectId
          ? client.revokeMigrationToken(projectId, id, options)
          : client.revokeMigrationTokenById(id, options);
      },
    }),
    sessions: Object.freeze({
      create: delegate(client, "createCloudImportSession"),
      uploadChunk: delegate(client, "uploadCloudImportChunk"),
      finalize: delegate(client, "finalizeCloudImportSession"),
    }),
  });

  return Object.freeze({
    system,
    pricing,
    locations,
    account,
    projects,
    apiKeys,
    webhooks,
    keywords,
    backlinks,
    rankChecks,
    sitemapMonitors,
    signals,
    analytics,
    alertRules,
    alerts,
    notificationSettings,
    team,
    providers,
    savedViews,
    competitors,
    imports,
  });
}

export function installResourceNamespaces(client: BisibilityClient) {
  const methods = compatibilityMethods(client);
  for (const [name, resource] of Object.entries(createResourceNamespaces(client))) {
    Object.defineProperty(client, name, {
      configurable: false,
      enumerable: false,
      value: resource,
      writable: false,
    });
  }
  for (const [name, operation] of methods) {
    Object.defineProperty(client, name, {
      configurable: true,
      enumerable: false,
      value: (...args: unknown[]) => operation(...args),
      writable: true,
    });
  }
}
