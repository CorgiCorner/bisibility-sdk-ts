# @bisibility/sdk

> Part of [bisibility](https://github.com/CorgiCorner/bisibility) - an open-source SEO
> platform you can self-host and automate. This repository contains the TypeScript
> SDK for the Bisibility REST API.
>
> [Docs](https://bisibility.com/docs) ·
> [API reference](https://bisibility.com/docs/api/overview) ·
> [Roadmap](https://bisibility.com/roadmap)
>
> Current versions are listed on [npm](https://www.npmjs.com/package/@bisibility/sdk).

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

const projects = await bisibility.projects.list();
const projectId = projects.data[0]?.id;

if (projectId) {
  const created = await bisibility.keywords.add(projectId, {
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
    const check = await bisibility.rankChecks.runAndWait(keywordId);
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

const me = await bisibility.account.get();
const project = await bisibility.projects.create({ domain: "example.com", name: "Example" });
await bisibility.apiKeys.create({ name: "CI" }, { projectId: project.id });
```

OAuth clients can pass their opaque bearer token as `accessToken`. It is mutually exclusive with
`apiKey` and does not use API key prefix validation:

```ts
const bisibility = new BisibilityClient({
  accessToken: oauth.accessToken,
});
```

A custom `fetch` implementation can be injected for older runtimes, proxies, or testing:

```ts
const bisibility = new BisibilityClient({
  apiKey: "bsb_key_live_...",
  fetch: myFetch
});
```

Protected methods send the configured `apiKey` or `accessToken` as `Authorization: Bearer <token>`.
Write methods accept an optional
`idempotencyKey` request option, which maps to the server `Idempotency-Key` header.
Requests set `redirect: "error"` so credentials are never forwarded through an HTTP redirect.
Custom `fetch` implementations should preserve that behavior.

Requests identify the package with `X-Bisibility-Client: bisibility-sdk-ts/<version>` and, where
the runtime permits, the same value as `User-Agent`. Every request also declares its origin with
`X-Bisibility-Source: sdk` for usage reporting; pass a different value through the `headers`
config option. Inputs mirror JSON wire names, so payload
fields use snake_case (for example `tracking_scope` and `expires_in_days`). SDK-only configuration
and request options remain camelCase.

Idempotent requests retry network errors and HTTP 429/503 responses twice by default. GET, HEAD,
PUT, and DELETE are idempotent; any request carrying an `idempotencyKey` is also retryable. Set
`maxRetries: 0` to disable retries. Exponential backoff starts at 500ms, and `Retry-After` is honored
up to 60 seconds.

Every method accepts per-request options:

```ts
await bisibility.projects.list({
  headers: { "X-Request-Id": "..." },
  signal: controller.signal, // your own AbortSignal
  timeout: 10_000 // ms; composed with `signal` when both are set
});
```

Without an explicit timeout, every attempt has a 30-second timeout, including requests with a caller
cancellation signal. Set `timeout: null`
on the client or an individual request to opt out.

### API version compatibility

The SDK declares `Bisibility-API-Version: v1` on every request. Before its first ordinary API
operation, each client lazily checks `/capabilities` once; calling `getCapabilities()` first
satisfies the same check without a duplicate request. A server that advertises `apiVersions` but
does not serve `v1` fails with `BisibilityApiVersionError` before the requested operation runs.
Older servers whose capabilities response has no `apiVersions` field remain compatible, and the
original request continues normally.

Successful JSON responses are checked against each operation's required envelope and value types.
Malformed JSON, missing required fields, and incompatible values throw `BisibilityResponseError`.
Additional server fields remain compatible. Only keyword deletion permits an empty JSON response;
text endpoints and CSV exports use their documented text decoder.

## Public resource IDs

Every resource identifier accepted or returned by the SDK uses the current typed public ID format.
The format is a lowercase resource prefix, an underscore, and a 24-character
suffix: `prefix_[a-z][a-z0-9]{23}`. For example, a project ID is
`prj_a1b2c3d4e5f6g7h8j9k0m2n3` and a keyword ID is
`kw_b2c3d4e5f6g7h8j9k0m2n3p4`.

The SDK rejects malformed IDs, mixed-case values, and a valid ID with the wrong resource prefix
before sending a request. `PUBLIC_ID_PREFIXES`,
`isPublicIdOfType`, and resource-specific types such as `ProjectId`, `KeywordId`,
and `WebhookId` are exported for callers that build typed integrations.

Locations are identified by `location_key`; they do not expose a location ID.
Cloud import supports current version 7 and previous version 6 export packages. Version 7 keywords
carry a canonical `location_key`; both versions preserve explicit ranking normalization, provider,
and requested-depth metadata. Version 5 is retained only for metadata packages with no ranking
history; session creation accepts versions 7 and 6. Compatibility discovery returns the positive
integer versions advertised by the server, including versions newer than this SDK can import.
Pagination cursors are opaque SDK values; v3 API cursors returned by the server must be passed back
unchanged.

## Resource namespaces

The client groups operations by resource. Existing flat methods remain available as deprecated
compatibility delegates until 1.0.

| Namespace | Methods |
| - | - |
| `system` | `getHealth`, `getLiveness`, `getReadiness`, `getCapabilities`, `getOpenApi`, `getLlmsText` |
| `pricing` | `getRates`, `estimate` |
| `locations` | `search` |
| `account` | `get`, `update`, plus `tokens.list`, `tokens.create`, `tokens.revoke` |
| `projectContext` | `get`, `update` |
| `agentReports` | `list`, `create`, `get` |
| `aiVisibility` | `analyze` |
| `promptExplorer` | `compare` |
| `siteAudits` | `list`, `run`, `get` |
| `projects` | `list`, `create`, `get`, `update`, `delete`, `getDefaults`, `updateDefaults` |
| `apiKeys` | `list`, `iterate`, `create`, `revoke` |
| `webhooks` | `list`, `iterate`, `create`, `update`, `delete` |
| `keywords` | `list`, `iterate`, `add`, `get`, `update`, `setTargetUrl`, `delete`, `bulkUpdate`, `match`, `research`, plus `suggestions.list`, `metrics.get` |
| `backlinks` | `analyze`, `extendSnapshot` |
| `domainOverview` | `analyze`, `history`, `keywords`, `pages` |
| `rankChecks` | `list`, `iterate`, `run`, `getResult`, plus `history.export`, `history.iterate` |
| `sitemapMonitors` | `list`, `update` |
| `signals` | `list`, `iterate`, `create` |
| `analytics` | `overview.get`, `traffic.list`, `traffic.sync`, `searchPerformance.list` |
| `alertRules` | `list`, `iterate`, `create`, `update`, `delete` |
| `alerts` | `list`, `iterate`, `mute`, `markAllRead` |
| `notificationSettings` | `get`, `update` |
| `team` | `members.*` and `invites.*` |
| `providers` | `list`, `iterate`, `connect`, `test`, `updateSettings`, `setEnabled`, `setPriority`, `setPrimary`, `disconnect` |
| `savedViews` | `list`, `iterate`, `create`, `delete` |
| `competitors` | `list`, `iterate`, `add`, `remove` |
| `imports` | `runFromExport`, plus `compatibility.*`, `tokens.*`, `sessions.*` |

Domain Overview analysis accepts camelCase options and requires an explicit cost cap before any
request that can spend provider budget. Start with an estimate, then pass the accepted cap to the
paid request. Provider estimates and charges can be fractional cents, but `maxCostCents` is a whole
nonnegative cent integer, so round the estimate up:

```ts
const estimate = await bisibility.domainOverview.analyze(project.id, {
  estimateOnly: true,
  languageCode: "en",
  locationCode: 2840,
  target: "example.com",
});

const report = await bisibility.domainOverview.analyze(project.id, {
  languageCode: "en",
  locationCode: 2840,
  maxCostCents: Math.ceil(estimate.data.estimated_cost_cents),
  target: "example.com",
});
```

### Provider connections and priorities

Provider order uses ascending priority. `providers.connect()` accepts an optional `priority`, a
whole number from 0 to 1000, and sends it with the connect request: `0` promotes the provider and
renumbers the fallback chain, while an omitted priority keeps a reconnected provider's place and
appends a new connection to the end of the chain. The deprecated `primary` input and `setPrimary`
aliases remain compatible: `true` connects with `priority: 0`, while `false` leaves the order
unchanged.

```ts
await bisibility.providers.connect(projectId, "dataforseo", {
  credentials: { login: "api@example.com", api_key: "dataforseo-token" },
  priority: 0
});
```

Credentials are provider-specific. For Plausible, `credentials.login` is the site domain
configured in Plausible (its site_id, such as `example.com`) and defaults to the tracked project
domain when omitted, while `credentials.api_key` is the Stats API token:

```ts
await bisibility.providers.connect(projectId, "plausible", {
  credentials: { api_key: "plausible-stats-token", login: "example.com" }
});

const probe = await bisibility.providers.test(projectId, "plausible", {
  credentials: { api_key: "plausible-stats-token" }
});
// probe.message is "Connected." for SERP providers and "Connected · <detail>." for analytics providers.
```

`apiKeys.list()` and `apiKeys.create()` use the current project selected by authentication. Pass
`{ projectId }` to select the explicit project route. A personal access token spanning multiple
projects must pass `projectId` because the top-level route cannot select a project unambiguously.

List methods return `{ data, meta }` with `meta.next_cursor`. Most resource methods return the
resource object directly. Domain Overview and Backlinks preserve the API `{ data }` envelope, so
their results carry `result.data` with the resource payload.

Every cursor-paginated list has an `iterate*` counterpart that preserves filters and yields items
across all pages:

```ts
for await (const keyword of bisibility.keywords.iterate(projectId, { device: "desktop" })) {
  console.log(keyword.text);
}
```

The same pattern is available for rank checks, signals, API keys (including project API keys),
webhooks, alert rules, triggered alerts, team members, team invites, providers, saved views,
competitors, and migration tokens. `iterateCursorPagination` is exported for custom paginated
endpoints.

### Keyword research and metrics

`keywords.research` runs a paid, cached DataForSEO lookup for one seed. Select the research depth
up front with `resultLimit`; this endpoint does not use offset pagination. It requires API write
scope because a cache miss can spend the project's provider budget:

```ts
const research = await bisibility.keywords.research(projectId, {
  seed: "rank tracker",
  mode: "auto",
  resultLimit: 300,
  includeClickstream: false,
  maxCostCents: 5
});
```

Set `estimateOnly: true` for a free cache-aware dry run before a cost-sensitive request. A dry run
returns a cost-only `KeywordResearchEstimate` with `estimate: true`, an aggregate `cost_cents`, and
one `{ source, cost_cents, cached }` entry per planned source. It never carries `rows`,
`fetched_at`, `total_count`, or source statuses, so it cannot be mistaken for an empty result.
`keywords.research` returns `KeywordResearchEstimate | KeywordResearchResult`; narrow it with
`isKeywordResearchEstimate` (or `isKeywordResearchResult`) when `estimateOnly` is a variable:

```ts
import { isKeywordResearchEstimate } from "@bisibility/sdk";

const result = await bisibility.keywords.research(projectId, {
  seed: "rank tracker",
  estimateOnly
});

if (isKeywordResearchEstimate(result)) {
  console.log(result.cost_cents, result.sources);
} else {
  console.log(result.total_count, result.rows);
}
```

A literal `estimateOnly: true` resolves to `KeywordResearchEstimate` and a literal `false` or an
omitted `estimateOnly` resolves to `KeywordResearchResult`, so existing calls need no narrowing.
On a completed result, source diagnostics report `ok`, `failed`, or `skipped`, with a
machine-readable reason when applicable.

### Backlinks

`backlinks.analyze` returns the API `{ data }` envelope around either a `BacklinksSnapshot` or,
with `estimateOnly: true`, a cost-only `BacklinksEstimate`. An estimate carries `estimate: true`,
`estimated_cost_cents`, `cost_cents`, `cached`, `cached_until`, `provider`, and the normalized
target, and never `summary`, `history`, `rows`, `fetched_at`, `fetched_row_count`, or
`total_rows_available`, so it cannot be mistaken for an empty backlink profile. Narrow the union
with `isBacklinksEstimate` (or `isBacklinksSnapshot`):

```ts
import { isBacklinksEstimate } from "@bisibility/sdk";

const dryRun = await bisibility.backlinks.analyze(projectId, {
  target: "example.com",
  estimateOnly: true
});

const report = await bisibility.backlinks.analyze(projectId, {
  target: "example.com",
  resultLimit: 100,
  maxCostCents: Math.ceil(dryRun.data.estimated_cost_cents)
});

console.log(report.data.summary.backlinks_total, report.data.rows.length);

const result = await bisibility.backlinks.analyze(projectId, { target: "example.com", estimateOnly });
if (isBacklinksEstimate(result.data)) console.log(result.data.estimated_cost_cents);
```

As with keyword research, a literal `estimateOnly: true` resolves to `BacklinksEstimate` and a
literal `false` or an omitted `estimateOnly` resolves to `BacklinksSnapshot`.
`backlinks.extendSnapshot` always returns a `BacklinksSnapshot`.

`keywords.metrics.get` hydrates provider metrics for one to 700 keywords. Its input mirrors the API
request body, cached rows do not contribute to `cost_cents`, and API write scope is required:

```ts
const metrics = await bisibility.keywords.metrics.get(projectId, {
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

`projects.updateDefaults(projectId, patch)` sends `PATCH /projects/{id}/defaults` and returns the
persisted `ProjectDefaults` (default market, schedule, and timezone for new keywords):

```ts
await bisibility.projects.updateDefaults(projectId, {
  country: "United States",
  device: "desktop",
  frequency: "daily",
  serp_depth: 50
});
```

The schedule fields (`frequency`, `cron_expression`, `jitter_minutes`, `timezone`) are replaced as
a whole. `serp_depth` (`10`, `20`, `50`, or `100`) and `serp_stop_on_match` are independent of the
schedule: omitting either keeps its stored value.

### Sitemap monitors

A project has one sitemap monitor whose ID is the project ID, so
`sitemapMonitors.update(projectId, monitorId, input)` takes the same value for both identifiers.

### Queued rank checks

How a requested check executes is a property of the deployment, not of the call. Where a background
worker owns execution the server answers `202` with the queued run, and where checks run inline it
answers `201` with the finished check. `rankChecks.run` returns that union, so narrow it on
`status`:

```ts
const started = await bisibility.rankChecks.run(keywordId);
if (started.status === "queued") {
  console.log(`Queued as run ${started.id}`);
}
```

Every check carries the `run_id` of the run that produced it, which is how a queued run is followed
to its result. `rankChecks.runAndWait` does that polling for you and returns the finished check:

```ts
const check = await bisibility.rankChecks.runAndWait(keywordId, undefined, { timeoutMs: 120_000 });
console.log(check.position, check.ranking_url);
```

It throws `BisibilityTimeoutError` if the deadline passes before the check appears. The `async`
option is retained for compatibility and no longer changes what the server does.

Failed checks carry `status: "failed"`, an `error` message, and provider fallback `attempts`.

### Signals

`signals.create` ingests a signal (`POST /signals`) into the project tied to your API key;
`source` must be `"deploy"`, `"cms"`, or `"api"`, and `type` follows the
`category.event` pattern (for example `deploy.completed`). `listSignals(projectId, options)`
pages through a project's signals newest first with optional `source`, `type`, `from`, and `to`
filters:

```ts
await bisibility.signals.create({
  source: "deploy",
  type: "deploy.completed",
  payload: { version: "1.2.3" }, // <= 8KB serialized
  url: "https://example.com/releases/1"
});

const recent = await bisibility.signals.list(projectId, {
  source: "deploy",
  from: "2026-07-01T00:00:00.000Z"
});
```

### Public cost estimates

`pricing.getRates` and `pricing.estimate` are anonymous and work without an `apiKey`:

```ts
const rates = await bisibility.pricing.getRates();
const estimate = await bisibility.pricing.estimate({
  keywords: 250,
  frequency: "daily",
  provider: "dataforseo",
  option: "standard"
});
// estimate.data.monthly_cost_usd
```

## Errors

All SDK errors extend `BisibilityError`; its concrete subclasses are `BisibilityApiError`,
`BisibilityApiVersionError`, `BisibilityConfigurationError`, `BisibilityNetworkError`, and
`BisibilityResponseError`. `BisibilityApiVersionError` also extends `BisibilityApiError` and exposes
the declared version as `declaredApiVersion` plus the server advertisement as
`serverApiVersions`. The original RFC problem details body is available on API errors as
`error.problem`. API errors also provide `isRateLimit`, `isNotFound`, and `retryAfterSeconds`.
`error.headers` retains ordinary response headers while credential and cookie headers are removed
before the error is exposed to application logs.

```ts
import { BisibilityApiError, BisibilityApiVersionError } from "@bisibility/sdk";

try {
  await bisibility.keywords.get("kw_z9y8x7w6v5u4t3s2r1q0p9n8");
} catch (error) {
  if (error instanceof BisibilityApiVersionError) {
    console.error(error.declaredApiVersion, error.serverApiVersions);
  } else if (error instanceof BisibilityApiError) {
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

## Saved reports and provider budgets

Saved report reads never invoke a provider. Use `fresh_until` to determine freshness;
`state` is `fresh` or `stale`, while a domain report keeps its data outcome in `data_state`.
Own-key and credit budgets are independent. Omit a field to keep it and explicitly clear
a surface to remove its budget. Credit budgets always use cents.

```ts
const saved = await client.researchReports.list(projectId);
const report = await client.researchReports.get(projectId, "keyword_research", { seed: "example", resultLimit: 100 });
const budgets = await client.providers.budgets.list(projectId);
await client.providers.budgets.update(projectId, "dataforseo", { own: { app: null }, credits: { programmatic: { amount_per_month: 500, unit: "cents" } } });
```
