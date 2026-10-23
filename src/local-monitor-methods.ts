import type { BisibilityClient } from "./client.js";
import { BisibilityConfigurationError } from "./errors.js";
import type {
  LocalMonitorExportOptions,
  LocalMonitorHistoryOptions,
  LocalMonitorPointHistoryResponse,
  LocalMonitorPointListingsResponse,
  LocalMonitorPointReport,
  LocalMonitorReadOptions,
  LocalMonitorRunHistoryResponse,
  LocalMonitorRunResultResponse,
} from "./local-monitors.js";
import { type TrackingTransport, trackingId } from "./prompt-tracker-transport.js";
import type {
  LocalMeasurementTargetId,
  LocalMonitorId,
  LocalMonitorRunId,
  ProjectId,
  RequestOptions,
} from "./types.js";

function selection(
  options: LocalMonitorReadOptions &
    Partial<LocalMonitorHistoryOptions & LocalMonitorExportOptions>,
  history = false,
  exporting = false,
) {
  const allowed = new Set([
    "asOf",
    ...(history ? ["from", "to", "cursor"] : []),
    ...(exporting ? ["version", "format"] : []),
  ]);
  for (const key of Object.keys(options))
    if (!allowed.has(key)) throw new BisibilityConfigurationError("Unsupported Local selection.");
  for (const value of [options.asOf, options.from, options.to])
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString() !== value ||
        Date.parse(value) < 0 ||
        Date.parse(value) > Date.now())
    )
      throw new BisibilityConfigurationError(
        "Local selection dates require canonical UTC milliseconds.",
      );
  if (
    (options.from && options.to && options.from > options.to) ||
    (options.to && options.asOf && options.to > options.asOf)
  )
    throw new BisibilityConfigurationError("Invalid Local history interval.");
  if (
    options.cursor !== undefined &&
    (typeof options.cursor !== "string" ||
      options.cursor.length < 1 ||
      options.cursor.length > 8000)
  )
    throw new BisibilityConfigurationError("Local cursor must contain 1..8000 characters.");
  if (
    exporting &&
    ((options.version !== undefined && options.version !== "1") ||
      (options.format !== undefined && options.format !== "json" && options.format !== "csv"))
  )
    throw new BisibilityConfigurationError("Unsupported Local export version or format.");
  return {
    as_of: options.asOf,
    ...(history ? { from: options.from, to: options.to, cursor: options.cursor } : {}),
    ...(exporting ? { version: options.version ?? "1", format: options.format ?? "json" } : {}),
  };
}
export function createLocalMonitorMethods(transport: TrackingTransport) {
  function exportLocalMonitorRun(
    projectId: ProjectId,
    monitorId: LocalMonitorId,
    runId: LocalMonitorRunId,
    options?: LocalMonitorExportOptions & { format?: "json" },
    requestOptions?: RequestOptions,
  ): Promise<LocalMonitorPointReport>;
  function exportLocalMonitorRun(
    projectId: ProjectId,
    monitorId: LocalMonitorId,
    runId: LocalMonitorRunId,
    options: LocalMonitorExportOptions & { format: "csv" },
    requestOptions?: RequestOptions,
  ): Promise<string>;
  function exportLocalMonitorRun(
    projectId: ProjectId,
    monitorId: LocalMonitorId,
    runId: LocalMonitorRunId,
    options: LocalMonitorExportOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<LocalMonitorPointReport | string> {
    return transport.request<LocalMonitorPointReport | string>(
      "GET",
      `/projects/${trackingId(projectId, "prj")}/local-monitors/${trackingId(monitorId, "lmn")}/runs/${trackingId(runId, "lmr")}/export`,
      {
        ...requestOptions,
        query: selection(options, false, true),
        parseAs: options.format === "csv" ? "text" : "json",
      },
    );
  }
  return {
    listLocalMonitorRuns(
      projectId: ProjectId,
      monitorId: LocalMonitorId,
      options: LocalMonitorHistoryOptions = {},
      requestOptions?: RequestOptions,
    ) {
      return transport.request<LocalMonitorRunHistoryResponse>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/local-monitors/${trackingId(monitorId, "lmn")}/runs`,
        { ...requestOptions, query: selection(options, true) },
      );
    },
    getLocalMonitorRunResults(
      projectId: ProjectId,
      monitorId: LocalMonitorId,
      runId: LocalMonitorRunId,
      options: LocalMonitorReadOptions = {},
      requestOptions?: RequestOptions,
    ) {
      return transport.request<LocalMonitorRunResultResponse>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/local-monitors/${trackingId(monitorId, "lmn")}/runs/${trackingId(runId, "lmr")}/results`,
        { ...requestOptions, query: selection(options) },
      );
    },
    listLocalMonitorPointListings(
      projectId: ProjectId,
      monitorId: LocalMonitorId,
      runId: LocalMonitorRunId,
      targetId: LocalMeasurementTargetId,
      options: LocalMonitorReadOptions = {},
      requestOptions?: RequestOptions,
    ) {
      return transport.request<LocalMonitorPointListingsResponse>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/local-monitors/${trackingId(monitorId, "lmn")}/runs/${trackingId(runId, "lmr")}/points/${trackingId(targetId, "lmt")}/listings`,
        { ...requestOptions, query: selection(options) },
      );
    },
    listLocalMonitorPointHistory(
      projectId: ProjectId,
      monitorId: LocalMonitorId,
      runId: LocalMonitorRunId,
      targetId: LocalMeasurementTargetId,
      options: LocalMonitorHistoryOptions = {},
      requestOptions?: RequestOptions,
    ) {
      return transport.request<LocalMonitorPointHistoryResponse>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/local-monitors/${trackingId(monitorId, "lmn")}/runs/${trackingId(runId, "lmr")}/points/${trackingId(targetId, "lmt")}/history`,
        { ...requestOptions, query: selection(options, true) },
      );
    },
    exportLocalMonitorRun,
  };
}
export type LocalMonitorMethods = ReturnType<typeof createLocalMonitorMethods>;
export function installLocalMonitorMethods(client: BisibilityClient, transport: TrackingTransport) {
  for (const [name, method] of Object.entries(createLocalMonitorMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
