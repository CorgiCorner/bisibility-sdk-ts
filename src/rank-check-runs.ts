import type { ListResponse, PaginationOptions, ProjectId, RankCheckRunId } from "./types.js";

export interface ListRankCheckRunsOptions extends PaginationOptions {
  segment?: "history" | "planned";
  /** Comma-separated execution statuses. */
  status?: string;
}

/** Retained execution state is readable even when no rank-check observation exists. */
export interface RankCheckRunRead {
  id: RankCheckRunId;
  project_id: ProjectId;
  /** Output status and classification fields tolerate future server values. */
  status: string;
  outcome: string | null;
  terminal: boolean;
  polling_state: string;
  trigger: string;
  counts: {
    requested: number;
    total: number;
    completed: number;
    failed: number;
    deferred: number;
    skipped: number;
    cancelled: number;
  };
  counts_basis: string;
  keyword_count: number;
  target_count: number;
  planned_for: string | null;
  launched_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  blocked_reason: string | null;
  parent_run_id: RankCheckRunId | null;
  cost_cents: number | null;
  usage: { actual: number | null; estimated: number | null; unit: string } | null;
  native_estimate: {
    provider_id: string | null;
    unit: string | null;
    quantity: number | null;
    unknown_targets: number;
  } | null;
}

export type RankCheckRunReadList = ListResponse<RankCheckRunRead>;
