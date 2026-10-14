export interface LocalMonitorReadOptions {
  asOf?: string;
}
export interface LocalMonitorHistoryOptions extends LocalMonitorReadOptions {
  from?: string;
  to?: string;
  cursor?: string;
}
export interface LocalMonitorExportOptions extends LocalMonitorReadOptions {
  version?: "1";
  format?: "json" | "csv";
}
export * from "./local-monitor-models-0.js";
export * from "./local-monitor-models-1.js";
