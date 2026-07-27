# Changelog

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
