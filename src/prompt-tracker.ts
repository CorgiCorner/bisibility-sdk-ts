import type { PaginationOptions } from "./types.js";

export type PromptTrackerTopicId = `ait_${string}`;
export type PromptTrackerPromptId = `aip_${string}`;
export type PromptTrackerRevisionId = `apr_${string}`;
export type PromptTrackerScheduleId = `ais_${string}`;
export type PromptTrackerRunId = `air_${string}`;
export type PromptTrackerSampleId = `asm_${string}`;
export type PromptTrackerSource = "consumer_scrape" | "model_api" | "google_aio";
export type PromptTrackerEngine = "chat_gpt" | "gemini" | "claude" | "perplexity" | "google";
export type PromptTrackerRunState =
  | "planned"
  | "running"
  | "completed"
  | "partial"
  | "blocked"
  | "failed"
  | "cancelled"
  | "skipped";
export type PromptTrackerMeasurementState =
  | "answer_present"
  | "aio_not_present"
  | "partial"
  | "unavailable"
  | "failed"
  | "unknown";
export type PromptTrackerDispatchState =
  | "planned"
  | "claimed"
  | "submission_started"
  | "submitted"
  | "collecting"
  | "submission_unknown"
  | "terminal";
export type PromptTrackerJson =
  | string
  | number
  | boolean
  | null
  | PromptTrackerJson[]
  | { [key: string]: PromptTrackerJson };

export interface PromptTrackerSourceConfiguration {
  provider: "dataforseo";
  endpoint: string;
  engine: PromptTrackerEngine;
  source: PromptTrackerSource;
  model: string | null;
  parameters: Record<string, PromptTrackerJson>;
}
export interface PromptTrackerTopicInput {
  paused?: boolean;
  name: string;
  description?: string | null;
}
export interface PromptTrackerTopic extends PromptTrackerTopicInput {
  id: PromptTrackerTopicId;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface PromptTrackerGenerationReference {
  generation_id: `asg_${string}`;
  draft_id: string;
}
export interface PromptTrackerProviderDatasetReference {
  report_id: `agr_${string}`;
  row_index: number;
}
export interface PromptTrackerPromptInput {
  provider_dataset_reference?: PromptTrackerProviderDatasetReference;
  generation_reference?: PromptTrackerGenerationReference;
  text: string;
  category?: "neutral" | "comparative" | "branded";
  paused?: boolean;
  topic_id?: PromptTrackerTopicId | null;
  label?: string | null;
}
export interface PromptTrackerPrompt {
  id: PromptTrackerPromptId;
  topic_id: PromptTrackerTopicId | null;
  label: string | null;
  archived_at: string | null;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
  revisions: Array<{
    id: PromptTrackerRevisionId;
    generation_reference?: PromptTrackerGenerationReference;
    provider_dataset_reference?: PromptTrackerProviderDatasetReference;
    category: "neutral" | "comparative" | "branded";
    ordinal: number;
    text: string;
    text_hash: string;
    created_at: string;
  }>;
}
export interface PromptTrackerPreviewInput {
  prompt_ids: PromptTrackerPromptId[];
  configurations: PromptTrackerSourceConfiguration[];
  credential_connection_id?: string;
}
export interface PromptTrackerPreview {
  configurations: PromptTrackerSourceConfiguration[];
  credential_connection_id: string;
  credential_version: string;
  budget_revision: string;
  consent_revision: string;
  estimated_cost_cents: number;
}
/** Launch binds the reviewed preview and paid consent to a stable retry key. */
export interface PromptTrackerRunInput extends PromptTrackerPreviewInput {
  credential_connection_id: string;
  credential_version: string;
  budget_revision: string;
  consent_revision: string;
  deadline: string;
  origin?: "manual" | "scheduled";
  entry_source?: "app" | "api" | "mcp" | "worker";
  consent: true;
  schedule_id?: PromptTrackerScheduleId;
  planned_at?: string;
}
export interface PromptTrackerScheduleInput {
  name: string;
  cron: string;
  timezone: string;
  enabled?: boolean;
  configuration: PromptTrackerRunInput;
  next_run_at?: string | null;
}
export interface PromptTrackerSchedule extends Omit<PromptTrackerScheduleInput, "configuration"> {
  configuration: Pick<PromptTrackerPreviewInput, "prompt_ids" | "configurations">;
  id: PromptTrackerScheduleId;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
/**
 * Partial PATCH body for a schedule. The API accepts any subset of the create fields and
 * reads an explicit `consent` boolean at the TOP LEVEL (not nested in `configuration`)
 * whenever the patch enables the schedule, so budget consent is a sibling of the other
 * fields rather than part of the run configuration.
 */
export interface PromptTrackerSchedulePatch {
  name?: string;
  cron?: string;
  timezone?: string;
  enabled?: boolean;
  configuration?: PromptTrackerRunInput;
  next_run_at?: string | null;
  /**
   * Required (as `true`) when enabling a schedule, together with the run configuration the
   * backend will approve on the project's behalf.
   */
  consent?: boolean;
}
export interface PromptTrackerRun {
  id: PromptTrackerRunId;
  state: PromptTrackerRunState;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  planned_at: string | null;
  sample_count: number | null;
}
export interface PromptTrackerEvidence {
  answer_text: string | null;
  raw: unknown;
  answer_truncated: boolean;
  raw_truncated: boolean;
  search_results: Array<{ url: string; title: string | null; position: number }>;
  requested_locale: string | null;
  effective_locale: string | null;
  locale_mechanism: string | null;
  requested_model: string | null;
  actual_model: string | null;
  provider_status: string | null;
  observed_at: string | null;
  fetched_at: string;
  recorded_source: "fresh" | "cache";
}
export interface PromptTrackerSample {
  id: PromptTrackerSampleId;
  measurement: PromptTrackerMeasurementState;
  source: PromptTrackerSource;
  engine: PromptTrackerEngine;
  prompt: string;
  prompt_revision_id: PromptTrackerRevisionId;
  evidence: PromptTrackerEvidence | null;
  citations: Array<{ url: string; title: string | null; position: number }>;
  cost_usd: string | null;
  cost_state: "unknown" | "pending" | "confirmed" | "refund_pending" | "derived";
}
export interface PromptTrackerEvidenceOptions extends PaginationOptions {
  run_id: PromptTrackerRunId;
  format?: "json" | "csv";
}
export interface PromptTrackerExport {
  items: PromptTrackerSample[];
  run_id: PromptTrackerRunId;
  next_cursor: string | null;
  scope?: { complete: boolean; max_pages: number; loaded: number; resumed: boolean };
}
export interface PromptTrackerTrendOptions extends PromptTrackerEvidenceOptions {
  previous_run_id?: PromptTrackerRunId;
}
export interface PromptTrackerDenominator {
  expected: number;
  observed: number;
  eligible: number;
  mentioned: number;
  absent_aio: number;
  partial: number;
  failed: number;
  unknown: number;
  missing: number;
  coverage: number;
  mention_rate: number | null;
}
export type PromptTrackerTrendStratumCategory = "neutral" | "comparative" | "branded" | "unknown";

export interface PromptTrackerTrendStratum {
  category: PromptTrackerTrendStratumCategory;
  current: PromptTrackerDenominator;
  previous?: PromptTrackerDenominator;
  comparable: boolean;
  reason: string | null;
  delta: number | null;
}

export interface PromptTrackerTrends {
  comparable: boolean;
  reason: string | null;
  current_run_id: PromptTrackerRunId;
  previous_run_id?: PromptTrackerRunId;
  previous?: PromptTrackerDenominator;
  current: PromptTrackerDenominator;
  delta: number | null;
  /**
   * Comparison baseline. Fixed at `"neutral"` to document that the top-level denominator
   * aggregates only neutral prompts, matching the API response contract.
   */
  baseline: "neutral";
  /**
   * Category of the top-level denominator. Fixed at `"neutral"` for the same reason as
   * `baseline`; strata carry the other categories.
   */
  category: "neutral";
  /** Per-category denominator breakdowns comparing the current and previous runs. */
  strata: PromptTrackerTrendStratum[];
  next_cursor: string | null;
  previous_next_cursor?: string | null;
}
