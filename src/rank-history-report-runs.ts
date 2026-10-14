import type { KeywordId, RankCheckRunId } from "./types.js";

interface RankHistoryRunRecordBase {
  recorded_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: string;
  blocked_reason: string | null;
  run_id: RankCheckRunId;
  rank_check_state: string;
}
/** A retained execution item, not a provider observation or a synthetic RankCheck. */
export interface RankHistoryReportRunItem extends RankHistoryRunRecordBase {
  kind: "rank_check_run_item";
  id: string;
  keyword_id: KeywordId;
  keyword: string;
  not_before: string | null;
  run_status: string;
  run_outcome: string | null;
  scope_membership: string;
}
/** Project-only runs explicitly lack retained keyword membership. */
export interface RankHistoryReportRun extends RankHistoryRunRecordBase {
  kind: "rank_check_run";
  id: RankCheckRunId;
  planned_for: string | null;
  launched_at: string | null;
  outcome: string | null;
  trigger: string;
  selection_kind: string;
  scope_membership: string;
  counts: {
    requested: number;
    total: number;
    completed: number;
    failed: number;
    deferred: number;
    skipped: number;
    cancelled: number;
  };
}
