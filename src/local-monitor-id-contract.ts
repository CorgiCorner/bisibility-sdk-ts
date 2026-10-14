import { type PublicIdPrefix, isPublicIdOfType } from "./public-id.js";
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function id(value: unknown, prefix: PublicIdPrefix, expected?: string) {
  if (!isPublicIdOfType(value, prefix) || (expected !== undefined && value !== expected))
    throw new TypeError("Local response identifier does not match its retained scope.");
}
function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}
export function validateLocalMonitorResponse(path: string, response: unknown) {
  const route = path.split("/").filter(Boolean);
  if (route[0] !== "projects" || route[2] !== "local-monitors") return;
  const envelope = record(response);
  const row = record(envelope?.data) ?? envelope;
  if (!row) return; // The generated response contract rejects a missing envelope.
  const camel = route.at(-1) === "export";
  const field = (snake: string, name: string) => row[camel ? name : snake];
  if (route.at(-1) === "history" && route[6] === "points") {
    id(row.target_id, "lmt", route[7]);
    for (const item of array(row.items)) id(record(item)?.run_id, "lmr");
  } else if (route.at(-1) !== "listings") {
    id(field("project_id", "projectId"), "prj", route[1]);
    id(field("monitor_id", "monitorId"), "lmn", route[3]);
    if (route[5]) id(field("run_id", "runId"), "lmr", route[5]);
    for (const item of array(row.items)) id(record(item)?.run_id, "lmr");
    for (const point of array(row.points)) {
      const p = record(point);
      id(p?.id, "lmt");
      id(p?.[camel ? "keywordId" : "keyword_id"], "kw");
    }
    for (const grid of array(row.grids)) {
      const g = record(grid);
      id(g?.[camel ? "keywordId" : "keyword_id"], "kw");
      for (const target of array(g?.[camel ? "pointIds" : "point_ids"])) id(target, "lmt");
    }
  }
}
