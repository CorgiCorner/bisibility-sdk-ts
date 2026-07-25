# Changelog

## 0.2.0 - 2026-07-25

- Added `getProjectDefaults` to read a project's effective market and schedule defaults.
- Aligned project defaults types with the API's SERP depth, stop-on-match, source, and accepted patch fields.
- Breaking for typed consumers: removed the retired `auto_schedule` field from the project defaults and keyword schedule types. The instance dropped the underlying column on 2026-07-16, so the field never carried a value at runtime.
