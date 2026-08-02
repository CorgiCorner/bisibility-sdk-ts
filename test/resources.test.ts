import { describe, expect, it, vi } from "vitest";
import { BisibilityClient } from "../src/client.js";

type Callable = (...args: unknown[]) => unknown;

const resourceMethods = {
  "account.get": "getMe",
  "account.tokens.create": "createMyToken",
  "account.tokens.list": "listMyTokens",
  "account.tokens.revoke": "revokeMyToken",
  "account.update": "updateMe",
  "alertRules.create": "createAlertRule",
  "alertRules.delete": "deleteAlertRule",
  "alertRules.iterate": "iterateAlertRules",
  "alertRules.list": "listAlertRules",
  "alertRules.update": "updateAlertRule",
  "alerts.iterate": "iterateTriggeredAlerts",
  "alerts.list": "listTriggeredAlerts",
  "alerts.mute": "muteTriggeredAlert",
  "analytics.overview.get": "getProjectOverview",
  "analytics.searchPerformance.list": "listSearchPerformanceQueryStats",
  "analytics.traffic.list": "listTrafficSnapshots",
  "analytics.traffic.sync": "syncProjectTraffic",
  "backlinks.analyze": "analyzeBacklinks",
  "backlinks.extendSnapshot": "loadMoreBacklinkRows",
  "competitors.add": "addCompetitor",
  "competitors.iterate": "iterateCompetitors",
  "competitors.list": "listCompetitors",
  "imports.compatibility.get": "getCloudImportCompatibility",
  "imports.runFromExport": "importCloudExport",
  "imports.sessions.create": "createCloudImportSession",
  "imports.sessions.finalize": "finalizeCloudImportSession",
  "imports.sessions.uploadChunk": "uploadCloudImportChunk",
  "imports.tokens.create": "mintMigrationToken",
  "imports.tokens.iterate": "iterateMigrationTokens",
  "imports.tokens.list": "listMigrationTokens",
  "keywords.add": "addKeywords",
  "keywords.bulkUpdate": "bulkUpdateKeywords",
  "keywords.delete": "deleteKeyword",
  "keywords.get": "getKeyword",
  "keywords.iterate": "iterateKeywords",
  "keywords.list": "listKeywords",
  "keywords.match": "matchProjectKeywords",
  "keywords.metrics.get": "getKeywordMetrics",
  "keywords.research": "researchKeywords",
  "keywords.saved.create": "createSavedKeywords",
  "keywords.saved.delete": "deleteSavedKeyword",
  "keywords.saved.iterate": "iterateSavedKeywords",
  "keywords.saved.list": "listSavedKeywords",
  "keywords.setTargetUrl": "setKeywordTargetUrl",
  "keywords.suggestions.list": "listRankedKeywordSuggestions",
  "keywords.update": "updateKeyword",
  "locations.search": "searchLocations",
  "notificationSettings.get": "getNotificationPreferences",
  "notificationSettings.update": "updateNotificationPreferences",
  "pricing.estimate": "getCostEstimate",
  "pricing.getRates": "getProviderRates",
  "projects.create": "createProject",
  "projects.delete": "deleteProject",
  "projects.get": "getProject",
  "projects.getDefaults": "getProjectDefaults",
  "projects.list": "listProjects",
  "projects.update": "updateProject",
  "projects.updateDefaults": "updateProjectDefaults",
  "providers.connect": "connectProvider",
  "providers.disconnect": "disconnectProvider",
  "providers.iterate": "iterateProviders",
  "providers.list": "listProviders",
  "providers.setEnabled": "setProviderEnabled",
  "providers.setPrimary": "setPrimaryProvider",
  "providers.setPriority": "setProviderPriority",
  "providers.test": "testProviderConnection",
  "providers.updateSettings": "updateProviderSettings",
  "rankChecks.getResult": "getRankCheckResult",
  "rankChecks.history.export": "exportRankHistory",
  "rankChecks.history.iterate": "iterateRankHistoryExport",
  "rankChecks.iterate": "iterateRankChecks",
  "rankChecks.list": "listRankChecks",
  "rankChecks.run": "runRankCheck",
  "savedViews.create": "createSavedView",
  "savedViews.iterate": "iterateSavedViews",
  "savedViews.list": "listSavedViews",
  "signals.create": "createSignal",
  "signals.iterate": "iterateSignals",
  "signals.list": "listSignals",
  "sitemapMonitors.list": "listSitemapMonitors",
  "sitemapMonitors.update": "updateSitemapMonitor",
  "system.getCapabilities": "getCapabilities",
  "system.getHealth": "getHealth",
  "system.getLiveness": "getLiveness",
  "system.getLlmsText": "getLlmsText",
  "system.getOpenApi": "getOpenApi",
  "system.getReadiness": "getReadiness",
  "team.invites.create": "createTeamInvite",
  "team.invites.iterate": "iterateTeamInvites",
  "team.invites.list": "listTeamInvites",
  "team.invites.resend": "resendTeamInvite",
  "team.members.iterate": "iterateTeamMembers",
  "team.members.list": "listTeamMembers",
  "team.members.remove": "removeTeamMember",
  "team.members.updateRole": "updateTeamMemberRole",
  "webhooks.create": "createWebhook",
  "webhooks.delete": "deleteWebhook",
  "webhooks.iterate": "iterateWebhooks",
  "webhooks.list": "listWebhooks",
  "webhooks.update": "updateWebhook",
} as const;

const customResourceMethods = [
  "alerts.markAllRead",
  "apiKeys.create",
  "apiKeys.iterate",
  "apiKeys.list",
  "apiKeys.revoke",
  "competitors.remove",
  "imports.tokens.revoke",
  "savedViews.delete",
  "team.invites.revoke",
] as const;

const topLevelResources = [
  "account",
  "alertRules",
  "alerts",
  "analytics",
  "apiKeys",
  "backlinks",
  "competitors",
  "imports",
  "keywords",
  "locations",
  "notificationSettings",
  "pricing",
  "projects",
  "providers",
  "rankChecks",
  "savedViews",
  "signals",
  "sitemapMonitors",
  "system",
  "team",
  "webhooks",
] as const;

function nestedValue(root: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, root);
}

function leafMethods(root: unknown, prefix = ""): string[] {
  if (!root || typeof root !== "object") return [];
  return Object.entries(root).flatMap(([name, value]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    if (typeof value === "function") return [path];
    return leafMethods(value, path);
  });
}

function replaceMethod(client: BisibilityClient, name: string, implementation: Callable) {
  Object.defineProperty(client, name, {
    configurable: true,
    value: implementation,
    writable: true,
  });
}

describe("resource namespaces", () => {
  it("exposes the approved stable top-level resource objects", () => {
    const client = new BisibilityClient();
    const exposed = topLevelResources.filter((name) => Object.hasOwn(client, name));

    expect(exposed).toEqual(topLevelResources);
    for (const name of topLevelResources) {
      expect(Object.isFrozen(client[name])).toBe(true);
    }
    expect(Object.isFrozen(client.team.invites)).toBe(true);
    expect(Object.isFrozen(client.rankChecks.history)).toBe(true);
    expect(Object.isFrozen(client.keywords.saved)).toBe(true);
  });

  it("installs every flat compatibility method as a non-enumerable instance delegate", () => {
    const client = new BisibilityClient();
    const prototype = BisibilityClient.prototype as unknown as Record<string, unknown>;
    const methodNames = Object.getOwnPropertyNames(BisibilityClient.prototype).filter(
      (name) =>
        name !== "constructor" &&
        ![
          "assertApiVersionCompatible",
          "buildUrl",
          "ensureApiVersionPreflight",
          "errorFromResponse",
          "jsonFromResponse",
          "request",
          "requestOrUndefined",
        ].includes(name) &&
        typeof prototype[name] === "function",
    );

    for (const name of methodNames) {
      const descriptor = Object.getOwnPropertyDescriptor(client, name);
      expect(descriptor?.enumerable, name).toBe(false);
      expect(descriptor?.value, name).toBeTypeOf("function");
      expect(descriptor?.value, name).not.toBe(prototype[name]);
    }
    expect(Object.hasOwn(client, "request")).toBe(false);
  });

  it("exposes every approved leaf method and no undocumented leaf in the contract list", () => {
    const client = new BisibilityClient();
    const paths = [...Object.keys(resourceMethods), ...customResourceMethods].sort();

    for (const path of paths) {
      expect(nestedValue(client, path), path).toBeTypeOf("function");
    }
    const exposed = topLevelResources.flatMap((name) => leafMethods(client[name], name)).sort();
    expect(exposed).toEqual(paths);
  });

  it.each(Object.entries(resourceMethods))("delegates %s to %s", (path, flatMethod) => {
    const client = new BisibilityClient();
    const result = Symbol(path);
    const method = vi.fn(() => result);
    replaceMethod(client, flatMethod, method);

    expect((nestedValue(client, path) as Callable)()).toBe(result);
    expect(method).toHaveBeenCalledOnce();
  });

  it("selects the default and explicit project API key routes", () => {
    const client = new BisibilityClient();
    const listDefault = vi.fn(() => "default-list");
    const listProject = vi.fn(() => "project-list");
    const iterateDefault = vi.fn(() => "default-iterate");
    const iterateProject = vi.fn(() => "project-iterate");
    const createDefault = vi.fn(() => "default-create");
    const createProject = vi.fn(() => "project-create");
    replaceMethod(client, "listApiKeys", listDefault);
    replaceMethod(client, "listProjectApiKeys", listProject);
    replaceMethod(client, "iterateApiKeys", iterateDefault);
    replaceMethod(client, "iterateProjectApiKeys", iterateProject);
    replaceMethod(client, "createApiKey", createDefault);
    replaceMethod(client, "createProjectApiKey", createProject);

    expect(client.apiKeys.list({ limit: 25 })).toBe("default-list");
    expect(client.apiKeys.list({ limit: 25, projectId: "prj_a00000000000000000000000" })).toBe(
      "project-list",
    );
    expect(client.apiKeys.iterate({ limit: 10 })).toBe("default-iterate");
    expect(client.apiKeys.iterate({ limit: 10, projectId: "prj_a00000000000000000000000" })).toBe(
      "project-iterate",
    );
    expect(client.apiKeys.create({ name: "Default" })).toBe("default-create");
    expect(
      client.apiKeys.create({ name: "Project" }, { projectId: "prj_a00000000000000000000000" }),
    ).toBe("project-create");

    expect(listDefault).toHaveBeenCalledWith({ limit: 25 }, undefined);
    expect(listProject).toHaveBeenCalledWith(
      "prj_a00000000000000000000000",
      { limit: 25 },
      undefined,
    );
    expect(iterateDefault).toHaveBeenCalledWith({ limit: 10 }, undefined);
    expect(iterateProject).toHaveBeenCalledWith(
      "prj_a00000000000000000000000",
      { limit: 10 },
      undefined,
    );
  });

  it.each([
    ["savedViews.delete", "deleteSavedViewById", "deleteSavedView", "view"],
    ["competitors.remove", "removeCompetitorById", "removeCompetitor", "comp"],
    ["team.invites.revoke", "revokeTeamInviteById", "revokeTeamInvite", "invite"],
    ["imports.tokens.revoke", "revokeMigrationTokenById", "revokeMigrationToken", "mig"],
  ])("selects ID-only and project-scoped routes for %s", (path, byId, byProject, prefix) => {
    const client = new BisibilityClient();
    const id = `${prefix}_a00000000000000000000000`;
    const idRoute = vi.fn(() => "id-route");
    const projectRoute = vi.fn(() => "project-route");
    replaceMethod(client, byId, idRoute);
    replaceMethod(client, byProject, projectRoute);
    const method = nestedValue(client, path) as Callable;

    expect(method(id)).toBe("id-route");
    expect(method({ id, projectId: "prj_a00000000000000000000000" })).toBe("project-route");
    expect(idRoute).toHaveBeenCalledWith(id, undefined);
    expect(projectRoute).toHaveBeenCalledWith("prj_a00000000000000000000000", id, undefined);
  });

  it("expresses project scope as an argument for marking all alerts read", () => {
    const client = new BisibilityClient();
    const flat = vi.fn(() => "read");
    replaceMethod(client, "markProjectAlertsRead", flat);

    expect(client.alerts.markAllRead({ projectId: "prj_a00000000000000000000000" })).toBe("read");
    expect(flat).toHaveBeenCalledWith("prj_a00000000000000000000000", undefined);
  });
});
