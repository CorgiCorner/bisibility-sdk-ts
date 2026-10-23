import { BisibilityConfigurationError } from "./errors.js";
import type { RequestOptions } from "./types.js";

export interface TrackingTransport {
  request<T>(
    method: string,
    path: string,
    options?: RequestOptions & {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
      parseAs?: "text" | "json";
    },
  ): Promise<T>;
}
const PUBLIC_ID_BODY = /^[a-z][a-z0-9]{23}$/;
/** True when `value` is `<prefix>_` followed by a 24-character public ID body. */
export function hasPublicIdShape(value: string, prefix: string): boolean {
  return value.startsWith(`${prefix}_`) && PUBLIC_ID_BODY.test(value.slice(prefix.length + 1));
}
export function trackingId(value: string, prefix: string) {
  if (!hasPublicIdShape(value, prefix))
    throw new BisibilityConfigurationError(`Expected a ${prefix}_ public ID.`);
  return encodeURIComponent(value);
}
export function validateTrackingInput(input: unknown): void {
  if (!input || typeof input !== "object") return;
  const row = input as Record<string, unknown>;
  if (row.popularity != null)
    throw new BisibilityConfigurationError("Caller popularity claims are not accepted.");
  if (row.provenance === "model_generated_hypothesis" && !row.generation_reference)
    throw new BisibilityConfigurationError("Model drafts require a trusted generation reference.");
  if (row.provenance === "provider_dataset" && !row.provider_dataset_reference)
    throw new BisibilityConfigurationError("Provider datasets require a trusted report reference.");
  if (
    Array.isArray(row.evidence_ids) &&
    row.evidence_ids.length &&
    !row.generation_reference &&
    !row.provider_dataset_reference
  )
    throw new BisibilityConfigurationError(
      "Evidence claims require a trusted provenance reference.",
    );
  if (Array.isArray(row.prompt_ids)) for (const id of row.prompt_ids) trackingId(String(id), "aip");
  for (const [key, prefix] of [
    ["topic_id", "ait"],
    ["schedule_id", "ais"],
    ["credential_connection_id", "conn"],
  ])
    if (row[key as string] != null) trackingId(String(row[key as string]), prefix as string);
  if (row.provider_dataset_reference) {
    const reference = row.provider_dataset_reference as { report_id: string; row_index: number };
    trackingId(reference.report_id, "agr");
    if (!Number.isInteger(reference.row_index) || reference.row_index < 0)
      throw new BisibilityConfigurationError("Dataset row index must be nonnegative.");
  }
  if (row.generation_reference) {
    const reference = row.generation_reference as { generation_id: string; draft_id: string };
    trackingId(reference.generation_id, "asg");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference.draft_id))
      throw new BisibilityConfigurationError("Expected a generated draft UUID.");
    if (row.provider_dataset_reference)
      throw new BisibilityConfigurationError("Choose one trusted provenance reference.");
  }
  if (Array.isArray(row.drafts)) for (const draft of row.drafts) validateTrackingInput(draft);
  if (row.configuration) validateTrackingInput(row.configuration);
}
