import type { RankCheckId } from "./types.js";

/** Retained provider evidence; these strings may grow as providers gain recovery states. */
export interface ProviderEvidenceRecovery {
  state: string | null;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  reason: string | null;
}

export interface ProviderEvidenceProjection {
  acceptance: string | null;
  fulfillment: string | null;
  /** Organic depth actually returned; null when unknown. */
  returned_depth: number | null;
  accounting: string | null;
  result: string | null;
  cost: string | null;
  original_checked_at: string | null;
  recovery: ProviderEvidenceRecovery | null;
}

export interface RankCheckRunEvidenceProjection extends ProviderEvidenceProjection {
  check_id: RankCheckId;
}
