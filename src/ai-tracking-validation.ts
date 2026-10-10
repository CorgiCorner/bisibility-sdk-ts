import { hasPublicIdShape } from "./ai-tracking-transport.js";
/** Tracking namespaces extend resource validation without rewriting the historical ID registry. */
export function validateAiTrackingResponse(path: string, response: unknown): void {
  const parts = path.split("/");
  if (parts[3] !== "ai-tracking" || !response || typeof response !== "object") return;
  const container = response as Record<string, unknown>;
  const resource = parts[4];
  const prefix =
    resource === "topics"
      ? "ait"
      : resource === "prompts"
        ? "aip"
        : resource === "schedules"
          ? "ais"
          : resource === "history" || resource === "runs"
            ? parts[6] === "samples"
              ? "asm"
              : parts[5] === "preview"
                ? null
                : "air"
            : null;
  const assertId = (id: unknown, expected: string) => {
    if (typeof id !== "string" || !hasPublicIdShape(id, expected))
      throw new TypeError(`Expected a ${expected}_ public response ID.`);
  };
  const rows = Array.isArray(container.data) ? container.data : [container.data];
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (prefix) assertId(row.id, prefix);
    if (prefix === "asm") assertId(row.prompt_revision_id, "apr");
    if (prefix === "aip" && row.topic_id != null) assertId(row.topic_id, "ait");
    if (Array.isArray(row.revisions))
      for (const revision of row.revisions)
        assertId((revision as Record<string, unknown>).id, "apr");
    if (resource === "suggestions" && parts[5] === "generate") assertId(row.generation_id, "asg");
    if ((resource === "runs" || resource === "suggestions") && parts[5] === "preview")
      assertId(row.credential_connection_id, "conn");
  }
}
