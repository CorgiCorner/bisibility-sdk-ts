import { type PublicIdPrefix, isPublicIdOfType, publicIdExpectation } from "./public-id.js";

type QueryValue = boolean | Date | number | string | null | undefined;
type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

interface RequestContract {
  body?: unknown;
  query?: QueryParams | undefined;
}

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function segments(path: string) {
  return (path.split("?", 1)[0] ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function assertId(value: unknown, prefix: PublicIdPrefix, label: string) {
  if (!isPublicIdOfType(value, prefix)) {
    throw new TypeError(`${label} must match ${publicIdExpectation(prefix)}.`);
  }
}

function assertOptionalId(value: unknown, prefix: PublicIdPrefix, label: string) {
  if (value !== undefined && value !== null) {
    assertId(value, prefix, label);
  }
}

function assertIdArray(value: unknown, prefix: PublicIdPrefix, label: string) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array of ${publicIdExpectation(prefix)} values.`);
  }
  for (const [index, item] of value.entries()) {
    assertId(item, prefix, `${label}[${index}]`);
  }
}

function assertAlertRuleInput(input: unknown) {
  const body = object(input);
  if (!body) return;
  if (body.recipient_ids !== undefined) {
    assertIdArray(body.recipient_ids, "usr", "recipient_ids");
  }
  if (body.target_ids === undefined) return;

  const targetType = body.target_type;
  if (targetType === "keyword") {
    assertIdArray(body.target_ids, "kw", "target_ids");
    return;
  }
  if (targetType === "tag") {
    assertIdArray(body.target_ids, "tag", "target_ids");
    return;
  }
  if (targetType === "all") {
    assertIdArray(body.target_ids, "kw", "target_ids");
    if (Array.isArray(body.target_ids) && body.target_ids.length > 0) {
      throw new TypeError("target_ids must be empty when target_type is all.");
    }
    return;
  }
  throw new TypeError("target_ids require target_type 'all', 'keyword', or 'tag'.");
}

function assertAlertRuleResponse(value: unknown, label: string) {
  const rule = object(value);
  if (!rule) throw new TypeError(`${label} must be an object.`);

  assertId(rule.id, "rule", `${label}.id`);
  assertIdArray(rule.recipient_ids, "usr", `${label}.recipient_ids`);

  if (rule.target_type === "keyword") {
    assertIdArray(rule.target_ids, "kw", `${label}.target_ids`);
  } else if (rule.target_type === "tag") {
    assertIdArray(rule.target_ids, "tag", `${label}.target_ids`);
  } else if (rule.target_type === "all") {
    assertIdArray(rule.target_ids, "kw", `${label}.target_ids`);
    if ((rule.target_ids as unknown[]).length > 0) {
      throw new TypeError(`${label}.target_ids must be empty when target_type is all.`);
    }
  } else {
    throw new TypeError(`${label}.target_type must be all, keyword, or tag.`);
  }

  for (const staleField of ["created_by_id", "project_id", "targets"]) {
    if (staleField in rule) {
      throw new TypeError(`${label}.${staleField} is not part of the public alert rule response.`);
    }
  }
}

const cloudImportLocations = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Poland",
  "Ireland",
  "Portugal",
  "Belgium",
  "Switzerland",
  "Austria",
  "Denmark",
  "Norway",
  "Finland",
  "Brazil",
  "Mexico",
  "India",
  "Japan",
  "Singapore",
  "New Zealand",
  "South Africa",
  "United Arab Emirates",
] as const;

function assertSchemaObject(value: unknown, label: string, properties: readonly string[]) {
  const input = object(value);
  if (!input) throw new TypeError(`${label} must be an object.`);
  for (const key of Object.keys(input)) {
    if (!properties.includes(key)) {
      throw new TypeError(`${label}.${key} is not part of the v4 cloud import schema.`);
    }
  }
  return input;
}

function required(input: JsonObject, key: string, label: string) {
  if (!Object.hasOwn(input, key)) throw new TypeError(`${label}.${key} is required.`);
  return input[key];
}

function assertString(
  value: unknown,
  label: string,
  minimum = 0,
  maximum?: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    (maximum !== undefined && value.length > maximum)
  ) {
    throw new TypeError(
      `${label} must be a string${minimum ? ` with at least ${minimum} characters` : ""}.`,
    );
  }
}

function assertNullableString(value: unknown, label: string, minimum = 0, maximum?: number) {
  if (value !== null) assertString(value, label, minimum, maximum);
}

function assertInteger(value: unknown, label: string, minimum?: number, maximum?: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new TypeError(`${label} must be an integer.`);
  }
}

function assertNullablePositiveInteger(value: unknown, label: string) {
  if (value !== null) assertInteger(value, label, 1);
}

function assertNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a number.`);
  }
}

function assertNullableNumber(value: unknown, label: string) {
  if (value !== null) assertNumber(value, label);
}

function assertBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean.`);
}

function assertEnum(value: unknown, values: readonly string[], label: string) {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new TypeError(`${label} must be one of ${values.join(", ")}.`);
  }
}

function assertArray(value: unknown, label: string, maximum?: number) {
  if (!Array.isArray(value) || (maximum !== undefined && value.length > maximum)) {
    throw new TypeError(`${label} must be an array.`);
  }
  return value;
}

function has(input: JsonObject, key: string) {
  return Object.hasOwn(input, key);
}

function assertCloudImportDevice(value: unknown, label: string) {
  assertEnum(value, ["desktop", "mobile"], label);
}

function assertCloudImportLocation(value: unknown, label: string) {
  assertEnum(value, cloudImportLocations, label);
}

function assertCloudImportDateTime(value: unknown, label: string) {
  assertString(value, label);
  if (Number.isNaN(Date.parse(value))) throw new TypeError(`${label} must be a date-time string.`);
}

function assertCloudImportRankingHistory(value: unknown, label: string) {
  const history = assertSchemaObject(value, label, [
    "checkedAt",
    "position",
    "previousPosition",
    "rankingUrl",
  ]);
  assertCloudImportDateTime(required(history, "checkedAt", label), `${label}.checkedAt`);
  if (has(history, "position"))
    assertNullablePositiveInteger(history.position, `${label}.position`);
  if (has(history, "previousPosition")) {
    assertNullablePositiveInteger(history.previousPosition, `${label}.previousPosition`);
  }
  if (has(history, "rankingUrl"))
    assertNullableString(history.rankingUrl, `${label}.rankingUrl`, 0, 500);
}

function assertCloudImportKeyword(value: unknown, label: string) {
  const keyword = assertSchemaObject(value, label, [
    "device",
    "id",
    "keyword",
    "location",
    "rankingHistory",
    "tags",
    "target_url",
  ]);
  assertId(required(keyword, "id", label), "kw", `${label}.id`);
  assertString(required(keyword, "keyword", label), `${label}.keyword`, 1, 180);
  assertCloudImportDevice(required(keyword, "device", label), `${label}.device`);
  assertCloudImportLocation(required(keyword, "location", label), `${label}.location`);
  if (has(keyword, "rankingHistory")) {
    for (const [index, entry] of assertArray(
      keyword.rankingHistory,
      `${label}.rankingHistory`,
      5000,
    ).entries()) {
      assertCloudImportRankingHistory(entry, `${label}.rankingHistory[${index}]`);
    }
  }
  if (has(keyword, "tags")) {
    for (const [index, tag] of assertArray(keyword.tags, `${label}.tags`, 12).entries()) {
      assertString(tag, `${label}.tags[${index}]`, 1, 48);
    }
  }
  if (has(keyword, "target_url")) {
    assertNullableString(keyword.target_url, `${label}.target_url`, 0, 500);
  }
}

function assertCloudImportCompetitor(value: unknown, label: string) {
  const competitor = assertSchemaObject(value, label, ["domain", "id", "label"]);
  assertId(required(competitor, "id", label), "comp", `${label}.id`);
  assertString(required(competitor, "domain", label), `${label}.domain`, 1, 253);
  if (has(competitor, "label")) assertNullableString(competitor.label, `${label}.label`, 0, 80);
}

function assertCloudImportSavedView(value: unknown, label: string) {
  const view = assertSchemaObject(value, label, ["config", "id", "name", "surface"]);
  assertId(required(view, "id", label), "view", `${label}.id`);
  assertString(required(view, "name", label), `${label}.name`, 1, 120);
  if (has(view, "surface"))
    assertEnum(view.surface, ["keywords", "competitors"], `${label}.surface`);
}

function assertCloudImportAlertRuleTarget(value: unknown, label: string) {
  const target = object(value);
  if (!target) throw new TypeError(`${label} must be an object.`);
  const type = required(target, "type", label);
  if (type === "keyword") {
    const keywordTarget = assertSchemaObject(value, label, [
      "device",
      "keyword",
      "keyword_id",
      "location",
      "type",
    ]);
    assertId(required(keywordTarget, "keyword_id", label), "kw", `${label}.keyword_id`);
    if (has(keywordTarget, "device"))
      assertCloudImportDevice(keywordTarget.device, `${label}.device`);
    if (has(keywordTarget, "keyword"))
      assertString(keywordTarget.keyword, `${label}.keyword`, 1, 180);
    if (has(keywordTarget, "location"))
      assertCloudImportLocation(keywordTarget.location, `${label}.location`);
    return;
  }
  if (type === "tag") {
    const tagTarget = assertSchemaObject(value, label, ["tag", "type"]);
    assertString(required(tagTarget, "tag", label), `${label}.tag`, 1, 80);
    return;
  }
  throw new TypeError(`${label}.type must be keyword or tag.`);
}

function assertCloudImportAlertRule(value: unknown, label: string) {
  const rule = assertSchemaObject(value, label, [
    "change_pct",
    "channels",
    "competitor_domain",
    "condition_type",
    "drop_positions",
    "enabled",
    "id",
    "name",
    "serp_feature",
    "target_type",
    "targets",
    "threshold_position",
    "top_n",
  ]);
  assertId(required(rule, "id", label), "rule", `${label}.id`);
  assertString(required(rule, "name", label), `${label}.name`, 1, 120);
  if (has(rule, "change_pct")) assertNullableNumber(rule.change_pct, `${label}.change_pct`);
  if (has(rule, "channels")) {
    for (const [index, channel] of assertArray(rule.channels, `${label}.channels`).entries()) {
      assertEnum(channel, ["email", "slack", "webhook"], `${label}.channels[${index}]`);
    }
  }
  if (has(rule, "competitor_domain")) {
    assertNullableString(rule.competitor_domain, `${label}.competitor_domain`);
  }
  if (has(rule, "condition_type")) {
    assertEnum(
      rule.condition_type,
      [
        "change_pct",
        "competitor_overtake",
        "ctr_drop",
        "downtrend",
        "enters_top_n",
        "exits_top_n",
        "position_drop",
        "serp_feature",
        "threshold",
        "url_mismatch",
      ],
      `${label}.condition_type`,
    );
  }
  if (has(rule, "drop_positions")) {
    assertNullablePositiveInteger(rule.drop_positions, `${label}.drop_positions`);
  }
  if (has(rule, "enabled")) assertBoolean(rule.enabled, `${label}.enabled`);
  if (has(rule, "serp_feature")) assertNullableString(rule.serp_feature, `${label}.serp_feature`);
  if (has(rule, "target_type")) {
    assertEnum(rule.target_type, ["all", "keyword", "tag"], `${label}.target_type`);
  }
  if (has(rule, "targets")) {
    for (const [index, target] of assertArray(rule.targets, `${label}.targets`, 1000).entries()) {
      assertCloudImportAlertRuleTarget(target, `${label}.targets[${index}]`);
    }
  }
  if (has(rule, "threshold_position")) {
    assertNullablePositiveInteger(rule.threshold_position, `${label}.threshold_position`);
  }
  if (has(rule, "top_n")) assertNullablePositiveInteger(rule.top_n, `${label}.top_n`);
}

function assertCloudImportNotificationPreference(value: unknown, label: string) {
  const preference = assertSchemaObject(value, label, [
    "alert_email",
    "alert_in_app",
    "check_email",
    "check_in_app",
    "import_email",
    "import_in_app",
    "invite_email",
    "invite_in_app",
    "report_email",
  ]);
  for (const key of Object.keys(preference)) assertBoolean(preference[key], `${label}.${key}`);
}

function assertCloudImportPackage(input: unknown) {
  const payload = assertSchemaObject(input, "Cloud import payload", [
    "alert_rules",
    "competitors",
    "exported_at",
    "keywords",
    "notification_preferences",
    "project_id",
    "saved_views",
    "scope",
    "version",
  ]);
  if (required(payload, "version", "Cloud import payload") !== 4) {
    throw new TypeError("Cloud import payload version must be 4.");
  }
  assertId(required(payload, "project_id", "Cloud import payload"), "prj", "project_id");
  for (const [index, keyword] of assertArray(
    required(payload, "keywords", "Cloud import payload"),
    "keywords",
    500,
  ).entries()) {
    assertCloudImportKeyword(keyword, `keywords[${index}]`);
  }
  for (const [index, rule] of assertArray(
    required(payload, "alert_rules", "Cloud import payload"),
    "alert_rules",
    500,
  ).entries()) {
    assertCloudImportAlertRule(rule, `alert_rules[${index}]`);
  }
  for (const [index, competitor] of assertArray(
    required(payload, "competitors", "Cloud import payload"),
    "competitors",
    500,
  ).entries()) {
    assertCloudImportCompetitor(competitor, `competitors[${index}]`);
  }
  for (const [index, preference] of assertArray(
    required(payload, "notification_preferences", "Cloud import payload"),
    "notification_preferences",
    50,
  ).entries()) {
    assertCloudImportNotificationPreference(preference, `notification_preferences[${index}]`);
  }
  for (const [index, view] of assertArray(
    required(payload, "saved_views", "Cloud import payload"),
    "saved_views",
    500,
  ).entries()) {
    assertCloudImportSavedView(view, `saved_views[${index}]`);
  }
  if (has(payload, "exported_at")) assertCloudImportDateTime(payload.exported_at, "exported_at");
  if (has(payload, "scope")) assertEnum(payload.scope, ["current", "history"], "scope");
}

function assertCloudImportSessionCreate(input: unknown) {
  const session = assertSchemaObject(input, "Cloud import session", [
    "chunk_count",
    "source_project_id",
    "totals",
    "version",
  ]);
  if (required(session, "version", "Cloud import session") !== 4) {
    throw new TypeError("Cloud import session version must be 4.");
  }
  assertInteger(required(session, "chunk_count", "Cloud import session"), "chunk_count", 1, 500);
  assertId(
    required(session, "source_project_id", "Cloud import session"),
    "prj",
    "source_project_id",
  );
  if (has(session, "totals")) {
    const totals = assertSchemaObject(session.totals, "totals", ["keywords", "rank_checks"]);
    if (has(totals, "keywords")) assertInteger(totals.keywords, "totals.keywords", 0);
    if (has(totals, "rank_checks")) assertInteger(totals.rank_checks, "totals.rank_checks", 0);
  }
}

function assertCloudImportSourceKeyword(value: unknown, label: string) {
  const keyword = assertSchemaObject(value, label, ["device", "location", "text"]);
  assertCloudImportDevice(required(keyword, "device", label), `${label}.device`);
  assertCloudImportLocation(required(keyword, "location", label), `${label}.location`);
  assertString(required(keyword, "text", label), `${label}.text`);
}

function assertCloudImportSessionSections(value: unknown, label: string) {
  const sections = assertSchemaObject(value, label, [
    "alert_rules",
    "competitors",
    "notification_preferences",
    "saved_views",
    "source_keyword_ids",
  ]);
  if (has(sections, "alert_rules")) {
    for (const [index, rule] of assertArray(
      sections.alert_rules,
      `${label}.alert_rules`,
      500,
    ).entries()) {
      assertCloudImportAlertRule(rule, `${label}.alert_rules[${index}]`);
    }
  }
  if (has(sections, "competitors")) {
    for (const [index, competitor] of assertArray(
      sections.competitors,
      `${label}.competitors`,
      500,
    ).entries()) {
      assertCloudImportCompetitor(competitor, `${label}.competitors[${index}]`);
    }
  }
  if (has(sections, "notification_preferences")) {
    for (const [index, preference] of assertArray(
      sections.notification_preferences,
      `${label}.notification_preferences`,
      50,
    ).entries()) {
      assertCloudImportNotificationPreference(
        preference,
        `${label}.notification_preferences[${index}]`,
      );
    }
  }
  if (has(sections, "saved_views")) {
    for (const [index, view] of assertArray(
      sections.saved_views,
      `${label}.saved_views`,
      500,
    ).entries()) {
      assertCloudImportSavedView(view, `${label}.saved_views[${index}]`);
    }
  }
  if (has(sections, "source_keyword_ids")) {
    const sourceKeywords = object(sections.source_keyword_ids);
    if (!sourceKeywords) throw new TypeError(`${label}.source_keyword_ids must be an object.`);
    for (const [key, keyword] of Object.entries(sourceKeywords)) {
      assertId(key, "kw", `${label}.source_keyword_ids.${key}`);
      assertCloudImportSourceKeyword(keyword, `${label}.source_keyword_ids.${key}`);
    }
  }
}

function assertCloudImportChunk(input: unknown) {
  const chunk = object(input);
  if (!chunk) throw new TypeError("Cloud import chunk must be an object.");
  const kind = required(chunk, "kind", "Cloud import chunk");
  if (kind === "keywords") {
    const keywordChunk = assertSchemaObject(input, "Cloud import chunk", [
      "checksum",
      "kind",
      "keywords",
    ]);
    assertString(required(keywordChunk, "checksum", "Cloud import chunk"), "checksum");
    if (!/^sha256:[0-9a-f]{64}$/.test(keywordChunk.checksum as string)) {
      throw new TypeError("checksum must match sha256:[0-9a-f]{64}.");
    }
    for (const [index, keyword] of assertArray(
      required(keywordChunk, "keywords", "Cloud import chunk"),
      "keywords",
      500,
    ).entries()) {
      assertCloudImportKeyword(keyword, `keywords[${index}]`);
    }
    return;
  }
  if (kind === "sections") {
    const sectionChunk = assertSchemaObject(input, "Cloud import chunk", [
      "checksum",
      "kind",
      "sections",
    ]);
    assertString(required(sectionChunk, "checksum", "Cloud import chunk"), "checksum");
    if (!/^sha256:[0-9a-f]{64}$/.test(sectionChunk.checksum as string)) {
      throw new TypeError("checksum must match sha256:[0-9a-f]{64}.");
    }
    assertCloudImportSessionSections(
      required(sectionChunk, "sections", "Cloud import chunk"),
      "sections",
    );
    return;
  }
  throw new TypeError("Cloud import chunk kind must be keywords or sections.");
}

function assertCloudImportCompatibilityResponse(value: unknown) {
  const response = object(value);
  if (!response) throw new TypeError("Cloud import compatibility response must be an object.");
  const versions = assertArray(
    required(response, "schema_versions_supported", "Cloud import compatibility response"),
    "schema_versions_supported",
  );
  for (const [index, version] of versions.entries()) {
    if (version !== 4) throw new TypeError(`schema_versions_supported[${index}] must be 4.`);
  }
  assertString(
    required(response, "app_version", "Cloud import compatibility response"),
    "app_version",
  );
  assertNullableString(
    required(response, "latest_migration", "Cloud import compatibility response"),
    "latest_migration",
  );
}

function assertCloudImportCounts(value: unknown, label: string) {
  const counts = object(value);
  if (!counts) throw new TypeError(`${label} must be an object.`);
  for (const [key, count] of Object.entries(counts)) assertInteger(count, `${label}.${key}`);
}

function assertCloudImportFinalizeResponse(value: unknown) {
  const response = object(value);
  if (!response) throw new TypeError("Cloud import finalize response must be an object.");
  assertCloudImportCounts(required(response, "counts", "Cloud import finalize response"), "counts");
  assertId(required(response, "job_id", "Cloud import finalize response"), "job", "job_id");
  if (required(response, "state", "Cloud import finalize response") !== "done") {
    throw new TypeError("state must be done.");
  }
}

function assertCloudImportSessionCreateResponse(value: unknown) {
  const response = object(value);
  if (!response) throw new TypeError("Cloud import session response must be an object.");
  assertId(required(response, "session_id", "Cloud import session response"), "job", "session_id");
  if (required(response, "state", "Cloud import session response") !== "receiving") {
    throw new TypeError("state must be receiving.");
  }
  const limits = object(required(response, "chunk_limits", "Cloud import session response"));
  if (!limits) throw new TypeError("chunk_limits must be an object.");
  for (const key of ["max_body_bytes", "max_history_rows", "max_keywords"]) {
    assertInteger(required(limits, key, "chunk_limits"), `chunk_limits.${key}`, 1);
  }
}

function assertCloudImportChunkResponse(value: unknown) {
  const response = object(value);
  if (!response) throw new TypeError("Cloud import chunk response must be an object.");
  if (required(response, "state", "Cloud import chunk response") !== "receiving") {
    throw new TypeError("state must be receiving.");
  }
  assertInteger(
    required(response, "chunks_received", "Cloud import chunk response"),
    "chunks_received",
    0,
  );
  assertInteger(required(response, "chunk_count", "Cloud import chunk response"), "chunk_count", 1);
}

function queryValues(query: QueryParams | undefined, key: string) {
  const value = query?.[key];
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function assertQueryIds(query: QueryParams | undefined, key: string, prefix: PublicIdPrefix) {
  for (const [index, value] of queryValues(query, key).entries()) {
    assertId(value, prefix, `${key}[${index}]`);
  }
}

/** Validates every public SDK request before a fetch is attempted. */
export function validatePublicIdRequest(path: string, contract: RequestContract = {}) {
  const route = segments(path);
  const [first, second, third, fourth, fifth] = route;

  if (first === "projects" && second) {
    assertId(second, "prj", "projectId");
  }
  if (first === "keywords" && second && second !== "bulk") {
    assertId(second, "kw", "keywordId");
  }
  if (first === "rank-checks" && second) assertId(second, "check", "checkId");
  if (first === "alert-rules" && second) assertId(second, "rule", "ruleId");
  if (first === "api-keys" && second) assertId(second, "key", "keyId");
  if (first === "saved-views" && second) assertId(second, "view", "viewId");
  if (first === "competitors" && second) assertId(second, "comp", "competitorId");
  if (first === "migration-tokens" && second) assertId(second, "mtok", "tokenId");
  if (first === "team" && second === "invites" && third) assertId(third, "invite", "inviteId");
  if (first === "me" && second === "tokens" && third && third !== "current") {
    assertId(third, "pat", "tokenId");
  }
  if (first === "cloud" && second === "import" && third === "sessions" && fourth) {
    assertId(fourth, "job", "sessionId");
  }

  if (first === "projects" && second && third === "webhooks" && fourth) {
    assertId(fourth, "webhook", "webhookId");
  }
  if (first === "projects" && second && third === "sitemap-monitors" && fourth) {
    assertId(fourth, "prj", "monitorId");
  }
  if (
    first === "projects" &&
    second &&
    third === "triggered-alerts" &&
    fourth &&
    fourth !== "mark-read"
  ) {
    assertId(fourth, "alert", "alertId");
  }
  if (first === "projects" && second && third === "team" && fourth === "invites" && fifth) {
    assertId(fifth, "invite", "inviteId");
  }
  if (first === "projects" && second && third === "team" && fourth === "members" && fifth) {
    assertId(fifth, "member", "memberId");
  }
  if (first === "projects" && second && third === "migration-tokens" && fourth) {
    assertId(fourth, "mtok", "tokenId");
  }
  if (first === "projects" && second && third === "competitors" && fourth) {
    assertId(fourth, "comp", "competitorId");
  }
  if (first === "projects" && second && third === "saved-views" && fourth) {
    assertId(fourth, "view", "viewId");
  }

  if (first === "keywords" && second === "bulk") {
    assertIdArray(object(contract.body)?.keyword_ids, "kw", "keyword_ids");
  }
  if (first === "signals") {
    assertOptionalId(object(contract.body)?.keyword_id, "kw", "keyword_id");
  }
  if (first === "projects" && third === "alert-rules") {
    assertAlertRuleInput(contract.body);
  }
  if (first === "alert-rules") assertAlertRuleInput(contract.body);
  if (first === "projects" && third === "exports" && fourth === "rank-history") {
    assertQueryIds(contract.query, "keyword_id", "kw");
  }
  if (
    first === "projects" &&
    third === "analytics" &&
    (fourth === "query-stats" || fourth === "traffic-snapshots")
  ) {
    assertQueryIds(contract.query, "connection_id", "conn");
  }
  if (
    first === "projects" &&
    (third === "ranked-keyword-suggestions" || third === "keyword-research")
  ) {
    assertQueryIds(contract.query, "connection_id", "conn");
  }
  if (first === "projects" && third === "keyword-metrics") {
    assertOptionalId(object(contract.body)?.connection_id, "conn", "connection_id");
  }
  if (first === "cloud" && second === "import" && third === "sessions" && !fourth) {
    assertCloudImportSessionCreate(contract.body);
  }
  if (first === "cloud" && second === "import" && !third) assertCloudImportPackage(contract.body);
  if (
    first === "cloud" &&
    second === "import" &&
    third === "sessions" &&
    fourth &&
    fifth === "chunks"
  ) {
    assertCloudImportChunk(contract.body);
  }
}

/** Validates ID-bearing public response fields for resources with contextual IDs. */
export function validatePublicIdResponse(path: string, response: unknown, method?: string) {
  const route = segments(path);
  const [first, second, third, fourth, fifth] = route;
  const requestMethod = method?.toUpperCase();
  if (first === "cloud" && second === "import") {
    if (third === "compatibility" && requestMethod === "GET") {
      assertCloudImportCompatibilityResponse(response);
      return;
    }
    if (!third && requestMethod === "POST") {
      assertCloudImportFinalizeResponse(response);
      return;
    }
    if (third === "sessions" && !fourth && requestMethod === "POST") {
      assertCloudImportSessionCreateResponse(response);
      return;
    }
    if (third === "sessions" && fourth && fifth === "chunks" && requestMethod === "PUT") {
      assertCloudImportChunkResponse(response);
      return;
    }
    if (third === "sessions" && fourth && fifth === "finalize" && requestMethod === "POST") {
      assertCloudImportFinalizeResponse(response);
      return;
    }
  }
  const isProjectAlertRuleRoute = first === "projects" && third === "alert-rules";
  const isTopLevelAlertRuleRoute = first === "alert-rules" && second;
  if (!isProjectAlertRuleRoute && !isTopLevelAlertRuleRoute) return;
  if (method?.toUpperCase() === "DELETE") return;

  const body = object(response);
  if (Array.isArray(body?.data)) {
    for (const [index, rule] of body.data.entries()) {
      assertAlertRuleResponse(rule, `data[${index}]`);
    }
    return;
  }
  assertAlertRuleResponse(response, "alert rule");
}
