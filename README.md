# @bisibility/sdk

> Part of [bisibility](https://github.com/CorgiCorner/bisibility) - open-source keyword
> rank tracking you can self-host and automate. This repository contains the TypeScript
> SDK for the Bisibility REST API.
>
> [Docs](https://bisibility.com/docs) ·
> [API reference](https://bisibility.com/docs/api/overview) ·
> [Roadmap](https://bisibility.com/roadmap)
>
> **Status:** Published on npm as v0.4.0.

TypeScript SDK for the Bisibility REST API.

## Requirements

- Node.js >= 18 (the SDK uses the global `fetch`, `Headers`, and `AbortSignal` APIs).
- The package is **ESM-only** (`"type": "module"`). Use `import`; there is no CommonJS build.
  From CommonJS you can use `await import("@bisibility/sdk")`.
- On runtimes without a global `fetch` (or to use a custom HTTP stack), inject your own
  implementation via the `fetch` config option (see Configuration).

## Install

```sh
npm install @bisibility/sdk
```

## Quickstart

```ts
import { BisibilityClient } from "@bisibility/sdk";

const bisibility = new BisibilityClient({
  apiKey: process.env.BISIBILITY_API_KEY
});

const projects = await bisibility.listProjects();
const projectId = projects.data[0]?.id;

if (projectId) {
  const created = await bisibility.addKeywords(projectId, {
    keywords: [
      {
        keyword: "rank tracker api",
        target_url: "https://example.com/rank-tracker",
        tags: ["api"]
      }
    ]
  });

  const keywordId = created.results[0]?.keyword.id;
  if (keywordId) {
    const check = await bisibility.runRankCheck(keywordId);
    console.log(check.position, check.ranking_url);
  }
}
```

## Configuration

```ts
const bisibility = new BisibilityClient({
  apiKey: "bsb_key_live_...",
  baseUrl: "https://bisibility.com/api/v1"
});
```

`baseUrl` should point at the API v1 root. For self-hosted installs, pass your own
`https://your-host.example/api/v1` URL. Browser apps may pass a relative URL such as `/api/v1`.

The client accepts project API keys (`bsb_key_live_...` or `bsb_key_test_...`) and personal access
tokens (`bsb_pat_live_...`). Retired `bsk_` and `bsp_` credentials are rejected locally. For a PAT
with multiple project memberships, set `projectId`
to send `X-Bisibility-Project` on project-implicit routes:

```ts
const bisibility = new BisibilityClient({
  apiKey: process.env.BISIBILITY_PERSONAL_ACCESS_TOKEN,
  projectId: process.env.BISIBILITY_PROJECT_ID
});

const me = await bisibility.getMe();
const project = await bisibility.createProject({ domain: "example.com", name: "Example" });
await bisibility.createProjectApiKey(project.id, { name: "CI" });
```

A custom `fetch` implementation can be injected for older runtimes, proxies, or testing:

```ts
const bisibility = new BisibilityClient({
  apiKey: "bsb_key_live_...",
  fetch: myFetch
});
```

Protected methods send `Authorization: Bearer <apiKey>`. Write methods accept an optional
`idempotencyKey` request option, which maps to the server `Idempotency-Key` header.
Requests set `redirect: "error"` so credentials are never forwarded through an HTTP redirect.
Custom `fetch` implementations should preserve that behavior.

Requests identify the package with `X-Bisibility-Client: bisibility-sdk-ts/<version>` and, where
the runtime permits, the same value as `User-Agent`. Inputs mirror JSON wire names, so payload
fields use snake_case (for example `tracking_scope` and `expires_in_days`). SDK-only configuration
and request options remain camelCase.

Idempotent requests retry network errors and HTTP 429/503 responses twice by default. GET, HEAD,
PUT, and DELETE are idempotent; any request carrying an `idempotencyKey` is also retryable. Set
`maxRetries: 0` to disable retries. Exponential backoff starts at 500ms, and `Retry-After` is honored
up to 60 seconds.

Every method accepts per-request options:

```ts
await bisibility.listProjects({
  headers: { "X-Request-Id": "..." },
  signal: controller.signal, // your own AbortSignal
  timeout: 10_000 // ms; composed with `signal` when both are set
});
```

Without an explicit timeout or signal, every attempt has a 30-second timeout. Set `timeout: null`
on the client or an individual request to opt out.

## Public resource IDs

Every resource identifier accepted or returned by the SDK uses public ID v3. The
format is a lowercase resource prefix, an underscore, and a 24-character CUID2
suffix: `prefix_[a-z][a-z0-9]{23}`. For example, a project ID is
`prj_a1b2c3d4e5f6g7h8j9k0m2n3` and a keyword ID is
`kw_b2c3d4e5f6g7h8j9k0m2n3p4`.

The SDK rejects raw database IDs, legacy IDs, mixed-case values, and a valid ID
with the wrong resource prefix before sending a request. `PUBLIC_ID_PREFIXES`,
`isPublicIdOfType`, and resource-specific types such as `ProjectId`, `KeywordId`,
and `WebhookId` are exported for callers that build typed integrations.

Locations are identified by `location_key`; they do not expose a location ID.
Cloud import and export payloads use schema version 5 only. Pagination cursors are opaque SDK
values; v3 API cursors returned by the server must be passed back unchanged.

## Methods

- Discovery: `getHealth`, `getOpenApi`, `getCapabilities`, `getLlmsText`, `searchLocations`
- Public cost (no API key required): `getProviderRates`, `getCostEstimate`
- Account and personal tokens: `getMe`, `updateMe`, `listMyTokens`, `createMyToken`,
  `revokeMyToken`
- Projects: `listProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject`,
  `updateProjectDefaults`
- API keys: `listApiKeys`, `createApiKey`, `revokeApiKey`, `listProjectApiKeys`,
  `createProjectApiKey`
- Webhooks: `listWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`
- Keywords: `listKeywords`, `iterateKeywords`, `addKeywords`, `getKeyword`, `updateKeyword`,
  `setKeywordTargetUrl`, `deleteKeyword`, `bulkUpdateKeywords`, `listRankedKeywordSuggestions`,
  `researchKeywords`, `getKeywordMetrics`
- Backlinks: `analyzeBacklinks`, `loadMoreBacklinkRows`
- Rank checks: `listRankChecks`, `runRankCheck`, `getRankCheckResult`, `exportRankHistory`,
  `iterateRankHistoryExport`
- Sitemap monitors: `listSitemapMonitors`, `updateSitemapMonitor`
- Signals: `createSignal`, `listSignals`
- Alert rules and triggered alerts: `listAlertRules`, `createAlertRule`, `updateAlertRule`,
  `deleteAlertRule`, `listTriggeredAlerts`, `muteTriggeredAlert`, `markProjectAlertsRead`
- Team: `listTeamMembers`, `listTeamInvites`, `createTeamInvite`, `revokeTeamInvite`,
  `revokeTeamInviteById`, `updateTeamMemberRole`, `removeTeamMember`, `resendTeamInvite`
- Analytics: `listTrafficSnapshots`, `listSearchPerformanceQueryStats`, `syncProjectTraffic`
- Providers: `listProviders`, `connectProvider`, `testProviderConnection`,
  `updateProviderSettings`, `setProviderEnabled`, `enableProvider`, `disableProvider`,
  `setProviderPriority`, `setPrimaryProvider`, `disconnectProvider`
- Saved views: `listSavedViews`, `createSavedView`, `deleteSavedView`, `deleteSavedViewById`
- Competitors: `listCompetitors`, `addCompetitor`, `removeCompetitor`, `removeCompetitorById`
- Notification preferences: `getNotificationPreferences`, `updateNotificationPreferences`
- Migration tokens: `listMigrationTokens`, `mintMigrationToken`, `revokeMigrationToken`,
  `revokeMigrationTokenById`

List methods return `{ data, meta }` with `meta.next_cursor`. Resource methods return the resource
object directly, matching the Bisibility API response shape.

Every cursor-paginated list has an `iterate*` counterpart that preserves filters and yields items
across all pages:

```ts
for await (const keyword of bisibility.iterateKeywords(projectId, { device: "desktop" })) {
  console.log(keyword.text);
}
```

The same pattern is available for rank checks, signals, API keys (including project API keys),
webhooks, alert rules, triggered alerts, team members, team invites, providers, saved views,
competitors, and migration tokens. `iterateCursorPagination` is exported for custom paginated
endpoints.

### Keyword research and metrics

`researchKeywords` runs a paid, cached DataForSEO lookup for one seed. Select the research depth
up front with `resultLimit`; this endpoint does not use offset pagination. It requires API write
scope because a cache miss can spend the project's provider budget:

```ts
const research = await bisibility.researchKeywords(projectId, {
  seed: "rank tracker",
  mode: "auto",
  resultLimit: 300,
  includeClickstream: false,
  maxCostCents: 5
});
```

Set `estimateOnly: true` for a free cache-aware dry run before a cost-sensitive request. Source
diagnostics report `ok`, `failed`, or `skipped`, with a machine-readable reason when applicable.

`getKeywordMetrics` hydrates provider metrics for one to 700 keywords. Its input mirrors the API
request body, cached rows do not contribute to `cost_cents`, and API write scope is required:

```ts
const metrics = await bisibility.getKeywordMetrics(projectId, {
  keywords: ["rank tracker", "seo api"],
  include_clickstream: false,
  estimate_only: true,
  max_cost_cents: 5
});
```

An estimate response includes `cached_count`, `fetched_count_estimate`, and
`estimated_cost_cents`, and never calls the provider or spends budget.

Search volume, CPC, competition, difficulty, intent, and monthly trend values can be null when a
provider market does not supply them.

### Project defaults

`updateProjectDefaults(projectId, patch)` sends `PATCH /projects/{id}/defaults` and returns the
persisted `ProjectDefaults` (default market, schedule, and timezone for new keywords):

```ts
await bisibility.updateProjectDefaults(projectId, {
  country: "United States",
  device: "desktop",
  frequency: "daily"
});
```

### Asynchronous rank checks

`runRankCheck` runs synchronously by default. Pass `async: true` to enqueue the check instead;
the server responds `202` with a `RankCheck` in `status: "running"` that you can poll via
`getRankCheckResult`:

```ts
const queued = await bisibility.runRankCheck(keywordId, undefined, { async: true });
// queued.status === "running"
const result = await bisibility.getRankCheckResult(queued.id);
```

Failed checks carry `status: "failed"`, an `error` message, and provider fallback `attempts`.

### Signals

`createSignal` ingests a signal (`POST /signals`) into the project tied to your API key;
`source` must be `"deploy"`, `"cms"`, or `"api"`, and `type` follows the
`category.event` pattern (for example `deploy.completed`). `listSignals(projectId, options)`
pages through a project's signals newest first with optional `source`, `type`, `from`, and `to`
filters:

```ts
await bisibility.createSignal({
  source: "deploy",
  type: "deploy.completed",
  payload: { version: "1.2.3" }, // <= 8KB serialized
  url: "https://example.com/releases/1"
});

const recent = await bisibility.listSignals(projectId, {
  source: "deploy",
  from: "2026-07-01T00:00:00.000Z"
});
```

### Public cost estimates

`getProviderRates` and `getCostEstimate` are anonymous and work without an `apiKey`:

```ts
const rates = await bisibility.getProviderRates();
const estimate = await bisibility.getCostEstimate({
  keywords: 250,
  frequency: "daily",
  provider: "dataforseo",
  option: "standard"
});
// estimate.data.monthly_cost_usd
```

## Errors

All SDK errors extend `BisibilityError`; its concrete subclasses are `BisibilityApiError`,
`BisibilityConfigurationError`, `BisibilityNetworkError`, and `BisibilityResponseError`. The
original RFC problem details body is available on API errors as `error.problem`. API errors also
provide `isRateLimit`, `isNotFound`, and `retryAfterSeconds`. `error.headers` retains ordinary
response headers while credential and cookie headers are removed before the error is exposed to
application logs.

```ts
import { BisibilityApiError } from "@bisibility/sdk";

try {
  await bisibility.getKeyword("kw_z9y8x7w6v5u4t3s2r1q0p9n8");
} catch (error) {
  if (error instanceof BisibilityApiError) {
    console.error(error.status, error.problem?.detail);
  }
}
```

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting. Changes are recorded in
[CHANGELOG.md](CHANGELOG.md).

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
