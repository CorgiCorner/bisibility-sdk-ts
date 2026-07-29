# Changelog

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
