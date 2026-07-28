/**
 * Public resource identifiers are stable API values. They are never database
 * primary keys and always use a lowercase 24-character CUID2 suffix.
 */
export const PUBLIC_ID_RESOURCE_REGISTRY = {
  alert: "triggeredAlert",
  audit: "auditLog",
  check: "rankCheck",
  comp: "competitor",
  conn: "providerConnection",
  hook: "ingestHook",
  invite: "invite",
  job: "cloudImportJob",
  key: "apiKey",
  kw: "keyword",
  member: "membership",
  mtok: "migrationToken",
  notif: "notification",
  pat: "personalAccessToken",
  prj: "project",
  rule: "alertRule",
  ses: "session",
  sig: "signal",
  skw: "savedKeyword",
  tag: "tag",
  usr: "user",
  view: "savedView",
  webhook: "webhookEndpoint",
} as const;

export const PUBLIC_ID_PREFIXES = Object.keys(PUBLIC_ID_RESOURCE_REGISTRY) as Array<
  keyof typeof PUBLIC_ID_RESOURCE_REGISTRY
>;

export type PublicIdPrefix = keyof typeof PUBLIC_ID_RESOURCE_REGISTRY;
export type PublicId = {
  [Prefix in PublicIdPrefix]: PublicIdForPrefix<Prefix>;
}[PublicIdPrefix];
export type PublicIdForPrefix<Prefix extends PublicIdPrefix> = `${Prefix}_${string}`;

const PUBLIC_ID_SUFFIX_PATTERN = "[a-z][a-z0-9]{23}";
const PUBLIC_ID_PATTERN = new RegExp(
  `^(${PUBLIC_ID_PREFIXES.join("|")})_(${PUBLIC_ID_SUFFIX_PATTERN})$`,
);

export function isPublicId(value: unknown): value is PublicId {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value);
}

export function isPublicIdOfType<Prefix extends PublicIdPrefix>(
  value: unknown,
  prefix: Prefix,
): value is PublicIdForPrefix<Prefix> {
  return isPublicId(value) && value.startsWith(`${prefix}_`);
}

export function publicIdExpectation(prefix: PublicIdPrefix) {
  return `${prefix}_[a-z][a-z0-9]{23}`;
}

export function assertPublicIdOfType<Prefix extends PublicIdPrefix>(
  value: unknown,
  prefix: Prefix,
  label = "public ID",
): asserts value is PublicIdForPrefix<Prefix> {
  if (!isPublicIdOfType(value, prefix)) {
    throw new TypeError(`${label} must match ${publicIdExpectation(prefix)}.`);
  }
}
