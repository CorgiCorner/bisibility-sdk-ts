import type { AiTrackingSuggestionSnapshot } from "./ai-tracking-suggestions.js";
import type { PaginationOptions } from "./types.js";

export type AiTrackingTopicId = `ait_${string}`;
export type AiTrackingPromptId = `aip_${string}`;
export type AiTrackingRevisionId = `apr_${string}`;
export type AiTrackingScheduleId = `ais_${string}`;
export type AiTrackingRunId = `air_${string}`;
export type AiTrackingSampleId = `asm_${string}`;
export type AiTrackingSource = "consumer_scrape" | "model_api" | "google_aio";
export type AiTrackingEngine = "chat_gpt" | "gemini" | "claude" | "perplexity" | "google";
export type AiTrackingRunState =
  | "planned"
  | "running"
  | "completed"
  | "partial"
  | "blocked"
  | "failed"
  | "cancelled"
  | "skipped";
export type AiTrackingMeasurementState =
  | "answer_present"
  | "aio_not_present"
  | "partial"
  | "unavailable"
  | "failed"
  | "unknown";
export type AiTrackingDispatchState =
  | "planned"
  | "claimed"
  | "submission_started"
  | "submitted"
  | "collecting"
  | "submission_unknown"
  | "terminal";
export type AiTrackingJson =
  | string
  | number
  | boolean
  | null
  | AiTrackingJson[]
  | { [key: string]: AiTrackingJson };

export interface AiTrackingSourceConfiguration {
  provider: "dataforseo";
  endpoint: string;
  engine: AiTrackingEngine;
  source: AiTrackingSource;
  model: string | null;
  parameters: Record<string, AiTrackingJson>;
}
export interface AiTrackingTopicInput {
  paused?: boolean;
  name: string;
  description?: string | null;
}
export interface AiTrackingTopic extends AiTrackingTopicInput {
  id: AiTrackingTopicId;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AiTrackingGenerationReference {
  generation_id: `asg_${string}`;
  draft_id: string;
}
export interface AiTrackingProviderDatasetReference {
  report_id: `agr_${string}`;
  row_index: number;
}
export interface AiTrackingPromptInput {
  provider_dataset_reference?: AiTrackingProviderDatasetReference;
  generation_reference?: AiTrackingGenerationReference;
  text: string;
  category?: "neutral" | "comparative" | "branded";
  paused?: boolean;
  topic_id?: AiTrackingTopicId | null;
  label?: string | null;
}
export interface AiTrackingPrompt {
  id: AiTrackingPromptId;
  topic_id: AiTrackingTopicId | null;
  label: string | null;
  archived_at: string | null;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
  revisions: Array<{
    id: AiTrackingRevisionId;
    generation_reference?: AiTrackingGenerationReference;
    provider_dataset_reference?: AiTrackingProviderDatasetReference;
    category: "neutral" | "comparative" | "branded";
    ordinal: number;
    text: string;
    text_hash: string;
    created_at: string;
  }>;
}
export interface AiTrackingPreviewInput {
  prompt_ids: AiTrackingPromptId[];
  configurations: AiTrackingSourceConfiguration[];
  credential_connection_id?: string;
}
export interface AiTrackingPreview {
  configurations: AiTrackingSourceConfiguration[];
  credential_connection_id: string;
  credential_version: string;
  budget_revision: string;
  consent_revision: string;
  estimated_cost_cents: number;
}
/** Launch binds the reviewed preview and paid consent to a stable retry key. */
export interface AiTrackingRunInput extends AiTrackingPreviewInput {
  credential_connection_id: string;
  credential_version: string;
  budget_revision: string;
  consent_revision: string;
  deadline: string;
  origin?: "manual" | "scheduled";
  entry_source?: "app" | "api" | "mcp" | "worker";
  consent: true;
  schedule_id?: AiTrackingScheduleId;
  planned_at?: string;
}
export interface AiTrackingScheduleInput {
  name: string;
  cron: string;
  timezone: string;
  enabled?: boolean;
  configuration: AiTrackingRunInput;
  next_run_at?: string | null;
}
export interface AiTrackingSchedule extends Omit<AiTrackingScheduleInput, "configuration"> {
  configuration: Pick<AiTrackingPreviewInput, "prompt_ids" | "configurations">;
  id: AiTrackingScheduleId;
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
export interface AiTrackingSchedulePatch {
  name?: string;
  cron?: string;
  timezone?: string;
  enabled?: boolean;
  configuration?: AiTrackingRunInput;
  next_run_at?: string | null;
  /**
   * Required (as `true`) when enabling a schedule, together with the run configuration the
   * backend will approve on the project's behalf.
   */
  consent?: boolean;
}
export interface AiTrackingRun {
  id: AiTrackingRunId;
  state: AiTrackingRunState;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  planned_at: string | null;
  sample_count: number | null;
}
export interface AiTrackingEvidence {
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
export interface AiTrackingSample {
  id: AiTrackingSampleId;
  measurement: AiTrackingMeasurementState;
  source: AiTrackingSource;
  engine: AiTrackingEngine;
  prompt: string;
  prompt_revision_id: AiTrackingRevisionId;
  evidence: AiTrackingEvidence | null;
  citations: Array<{ url: string; title: string | null; position: number }>;
  cost_usd: string | null;
  cost_state: "unknown" | "pending" | "confirmed" | "refund_pending" | "derived";
}
export interface AiTrackingEvidenceOptions extends PaginationOptions {
  run_id: AiTrackingRunId;
  format?: "json" | "csv";
}
export interface AiTrackingExport {
  items: AiTrackingSample[];
  run_id: AiTrackingRunId;
  next_cursor: string | null;
  scope?: { complete: boolean; max_pages: number; loaded: number; resumed: boolean };
}
export interface AiTrackingTrendOptions extends AiTrackingEvidenceOptions {
  previous_run_id?: AiTrackingRunId;
}
export interface AiTrackingDenominator {
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
export type AiTrackingTrendStratumCategory = "neutral" | "comparative" | "branded" | "unknown";

export interface AiTrackingTrendStratum {
  category: AiTrackingTrendStratumCategory;
  current: AiTrackingDenominator;
  previous?: AiTrackingDenominator;
  comparable: boolean;
  reason: string | null;
  delta: number | null;
}

export interface AiTrackingTrends {
  comparable: boolean;
  reason: string | null;
  current_run_id: AiTrackingRunId;
  previous_run_id?: AiTrackingRunId;
  previous?: AiTrackingDenominator;
  current: AiTrackingDenominator;
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
  strata: AiTrackingTrendStratum[];
  next_cursor: string | null;
  previous_next_cursor?: string | null;
}
export interface AiTrackingSuggestion {
  text: string;
  category: "neutral" | "comparative" | "branded";
  provenance: "generated_hypothesis" | "provider_dataset" | "model_generated_hypothesis";
  generation_reference?: AiTrackingGenerationReference;
  provider_dataset_reference?: AiTrackingProviderDatasetReference;
  evidence_ids: string[];
  popularity: number | null;
  accepted: false;
}
export interface AiTrackingSuggestions {
  input_snapshot?: AiTrackingSuggestionSnapshot;
  drafts: AiTrackingSuggestion[];
  method: "context_template_heuristic" | "manual_fallback";
  context_updated_at: string | null;
  requires_acceptance: boolean;
  cost_usd: string;
  limitations: string[];
}
export interface AiTrackingAcceptedDraft {
  text: string;
  category: "neutral" | "comparative" | "branded";
  generation_reference?: AiTrackingGenerationReference;
  provider_dataset_reference?: AiTrackingProviderDatasetReference;
  provenance?: AiTrackingSuggestion["provenance"];
  evidence_ids?: string[];
  popularity?: null;
  accepted?: false;
}
export interface AiTrackingAcceptanceInput {
  drafts: AiTrackingAcceptedDraft[];
}
