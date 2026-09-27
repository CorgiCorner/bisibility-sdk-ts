# Changelog

## 0.14.1 - 2026-09-27

- Replaced the stale README version label with a link to the current package registry release.

## 0.14.0 - 2026-09-27

- Added saved research report reads and separate own-key and credit provider budget methods.

- **Breaking (types):** `GET /projects/{project_id}/backlinks` now answers with either a
  `BacklinksSnapshot` or, for `estimateOnly: true`, a cost-only `BacklinksEstimate`.
  `backlinks.analyze` returns that discriminated union, `BacklinksSnapshot` no longer carries
  `estimate` or `estimated_cost_cents`, and `isBacklinksEstimate` / `isBacklinksSnapshot` are
  exported to narrow it. A literal `estimateOnly` still resolves to a single variant, so calls
  that pass `estimateOnly: true`, `false`, or nothing need no change.
- **Breaking (types):** `KeywordResearchResponse` is now
  `KeywordResearchEstimate | KeywordResearchResult`. The completed shape moved to
  `KeywordResearchResult` and no longer carries `estimate`; an estimate carries per-source
  `{ source, cost_cents, cached }` entries and no `rows`, `fetched_at`, `total_count`, or source
  statuses. `isKeywordResearchEstimate` / `isKeywordResearchResult` are exported to narrow it.
- **Breaking (types):** `ProjectDefaults["serp_depth"]` is the `SerpDepth` enum (`10`, `20`, `50`,
  `100`) instead of `number`.
- Added `serp_depth` to `ProjectDefaultsPatch`. Omitting it keeps the stored depth, as
  `serp_stop_on_match` already did, while the schedule fields are still replaced as a whole.
- `connectProvider` now sends `priority` in the connect request instead of promoting the
  connection with a follow-up `PATCH`. Priority `0` promotes the provider and renumbers the
  fallback chain server-side, an omitted priority keeps a reconnected provider's place, and the
  deprecated `primary: true` input is still sent as `priority: 0`.
- Documented Plausible credentials (`credentials.login` is the site domain and defaults to the
  project domain, `credentials.api_key` is the Stats API token) and the successful provider test
  message (`"Connected."`, or `"Connected · <detail>."` for analytics providers).
- Documented that a project's sitemap monitor ID is its project ID.

## 0.13.0 - 2026-09-20

- Add `maxCostCents` to `listRankedKeywordSuggestions` options and `max_cost_cents` to the rank-check
  run input; the server refuses the call with `cost_limit_exceeded` when its estimate is higher.
- Send `X-Bisibility-Source: sdk` on every request so the API can report SDK usage separately;
  a caller-provided `X-Bisibility-Source` default header wins.

## 0.12.0 - 2026-09-09

- Added depth and custom cadence to cost estimates, with typed result pages, billing units, and unknown monthly costs.

## 0.11.0 - 2026-09-05

- Modeled the queued rank-check contract: `client.rankChecks.run()` now returns either a completed
  check or the queued run answered with 202, and rank checks carry `run_id`.
- Added `client.rankChecks.runAndWait()`, which polls the keyword's rank history for the queued
  run's check and throws `BisibilityTimeoutError` when the deadline passes.
- Registered the `rcr` rank-check-run public ID prefix.

## 0.10.0 - 2026-08-14

- Added language-qualified market fields to keyword and location responses, including canonical
  `location_key`, `language_code`, and `language_label` values for SDK consumers.

## 0.9.0 - 2026-08-13

- Added typed Domain Overview analysis, history, keyword, and page operations with explicit
  provider cost caps and a `client.domainOverview` resource namespace.

## 0.8.0 - 2026-08-10

- Updated public ID documentation to describe the current typed identifier format without retired
  migration-version terminology.
- Preserved deprecated provider-primary inputs by promoting connections with priority 0;
  `primary: false` remains a no-op.
- Updated public development dependency resolution to address the high-severity `nanoid` advisory.

## 0.7.3 - 2026-08-04

- Updated the public development dependency resolution to fix the high-severity
  `brace-expansion` denial-of-service advisory.

## 0.7.2 - 2026-08-02

- Added a separate `accessToken` configuration option for OAuth bearer tokens without applying
  API key prefix validation.

## 0.7.1 - 2026-08-02

- Republished the 0.7.0 API surface after correcting release validation; runtime behavior is unchanged.

## 0.7.0 - 2026-08-02

- **Breaking for typed consumers:** `getHealth()`, `getLiveness()`, and `getReadiness()` now return
  status-only responses; degraded health and readiness HTTP 503 responses return normally without
  retries, while other endpoints retain 503 retries.
- Added resource-oriented namespaces such as `client.keywords.*`, `client.team.*`, and
  `client.imports.*`; flat methods remain available as deprecated delegates until 1.0.
- Added typed Saved Keywords list, iterator, create, and delete operations with `svkw` public IDs.
- Added `Bisibility-API-Version` compatibility declarations, lazy server compatibility checks,
  and `BisibilityApiVersionError` for unsupported newer server contracts.

## 0.6.1 - 2026-07-30

- Improved package metadata to describe the SDK's SEO rank-tracking, keyword, and ranking-history
  capabilities.

## 0.6.0 - 2026-07-29

- Breaking for API consumers: adopt the public ID v3 prefix registry and reject identifiers that
  use retired v2 prefixes before a request is sent.
- Breaking for authentication: require the namespaced `bsb_key_live_`, `bsb_key_test_`,
  `bsb_pat_live_`, or migration-token credential prefix.
- Breaking for cloud-import consumers: require schema v5 packages and sessions, and document v3
  cursors as opaque continuation values that must be passed back unchanged.

## 0.5.0 - 2026-07-29

- Breaking: align API key and saved-view types with the API, including key expiry, scopes, and
  saved-view surfaces.
- Add current alert-rule conditions, recipients, position-drop inputs, and severity.

## 0.4.0 - 2026-07-28

- Breaking for typed consumers: resource identifiers now use exported public ID v2 types instead
  of arbitrary strings, and malformed or mismatched IDs are rejected before a request is sent.
- Added response validation for public IDs so invalid resource identifiers returned by the API
  fail with a typed SDK error instead of entering application state.
- Breaking for cloud-import consumers: aligned package, session, chunk, compatibility, and response
  types with migration schema v4, including snake_case fields, typed IDs, and required arrays.

## 0.3.1 - 2026-07-28

- Added nullable `ranking_url` to `KeywordMatch`, containing the URL that ranked at
  `latest_position` in the last completed check or null when no check has completed.

## 0.3.0 - 2026-07-27

- Added `getProjectOverview` with device, range, and tag filters to read visibility, position
  distribution, rank totals, and check timing.
- Added `matchProjectKeywords` to correlate normalized request text (`matched_text`) with stored
  keyword text (`text`) for each market, with `meta.truncated_texts` flagging request texts whose
  per-market matches were truncated.
- Added typed `analyzeBacklinks` and `loadMoreBacklinkRows` methods with estimate, freshness,
  budget-limit, target-scope, and row-limit controls.

## 0.2.0 - 2026-07-25

- Added `getProjectDefaults` to read a project's effective market and schedule defaults.
- Aligned project defaults types with the API's SERP depth, stop-on-match, source, and accepted patch fields.
- Breaking for typed consumers: removed the retired `auto_schedule` field from the project defaults and keyword schedule types. The instance dropped the underlying column on 2026-07-16, so the field never carried a value at runtime.
