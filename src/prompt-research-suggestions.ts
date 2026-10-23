import type {
  PromptTrackerGenerationReference,
  PromptTrackerProviderDatasetReference,
} from "./prompt-tracker.js";

export interface PromptResearchSuggestionConfiguration {
  provider: "dataforseo";
  engine: "chat_gpt";
  model: string;
  language_code: string;
  country_iso_code?: string;
  max_output_tokens: number;
  advisory_cost_limit_cents: number;
}
export interface PromptResearchSuggestionSnapshot {
  context: {
    business: string;
    audience: string;
    products: string;
    goals: string;
    agent_rules: string;
  };
  competitors: Array<{ id: `cmp_${string}`; label: string | null; domain: string }>;
}
export interface PromptResearchSuggestionsPreviewInput {
  configuration: PromptResearchSuggestionConfiguration;
  input_snapshot: PromptResearchSuggestionSnapshot;
  credential_connection_id?: `conn_${string}`;
}
export interface PromptResearchSuggestionsPreview extends PromptResearchSuggestionsPreviewInput {
  version: 1;
  snapshot_hash: string;
  estimated_cost_cents: number;
  estimate_kind: "forecast";
  is_guaranteed_maximum: false;
  credential_connection_id: `conn_${string}`;
  credential_version: string;
  budget_revision: string;
  consent_revision: string;
  expires_at: string;
  limitations: string[];
}
export interface PromptResearchSuggestionsGenerateInput {
  preview: PromptResearchSuggestionsPreview;
  consent: true;
}
export interface PromptResearchModelSuggestion {
  draft_id: string;
  text: string;
  category: "neutral" | "comparative" | "branded";
  provenance: "model_generated_hypothesis";
  evidence_ids: [];
  popularity: null;
  accepted: false;
}
export interface PromptResearchSuggestionsGeneration {
  generation_id: `asg_${string}`;
  drafts: PromptResearchModelSuggestion[];
  cost_usd: string | null;
  cost_state: "unknown" | "confirmed";
  method: "model_generated_hypothesis";
  limitations: string[];
}
export interface PromptResearchSuggestion {
  text: string;
  category: "neutral" | "comparative" | "branded";
  provenance: "generated_hypothesis" | "provider_dataset" | "model_generated_hypothesis";
  generation_reference?: PromptTrackerGenerationReference;
  provider_dataset_reference?: PromptTrackerProviderDatasetReference;
  evidence_ids: string[];
  popularity: number | null;
  accepted: false;
}
export interface PromptResearchSuggestions {
  input_snapshot?: PromptResearchSuggestionSnapshot;
  drafts: PromptResearchSuggestion[];
  method: "context_template_heuristic" | "manual_fallback";
  context_updated_at: string | null;
  requires_acceptance: boolean;
  cost_usd: string;
  limitations: string[];
}
export interface PromptResearchAcceptedDraft {
  text: string;
  category: "neutral" | "comparative" | "branded";
  generation_reference?: PromptTrackerGenerationReference;
  provider_dataset_reference?: PromptTrackerProviderDatasetReference;
  provenance?: PromptResearchSuggestion["provenance"];
  evidence_ids?: string[];
  popularity?: null;
  accepted?: false;
}
export interface PromptResearchAcceptanceInput {
  drafts: PromptResearchAcceptedDraft[];
}
