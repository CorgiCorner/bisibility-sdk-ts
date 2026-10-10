export interface AiTrackingSuggestionConfiguration {
  provider: "dataforseo";
  engine: "chat_gpt";
  model: string;
  language_code: string;
  country_iso_code?: string;
  max_output_tokens: number;
  advisory_cost_limit_cents: number;
}
export interface AiTrackingSuggestionSnapshot {
  context: {
    business: string;
    audience: string;
    products: string;
    goals: string;
    agent_rules: string;
  };
  competitors: Array<{ id: `cmp_${string}`; label: string | null; domain: string }>;
}
export interface AiTrackingSuggestionsPreviewInput {
  configuration: AiTrackingSuggestionConfiguration;
  input_snapshot: AiTrackingSuggestionSnapshot;
  credential_connection_id?: `conn_${string}`;
}
export interface AiTrackingSuggestionsPreview extends AiTrackingSuggestionsPreviewInput {
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
export interface AiTrackingSuggestionsGenerateInput {
  preview: AiTrackingSuggestionsPreview;
  consent: true;
}
export interface AiTrackingModelSuggestion {
  draft_id: string;
  text: string;
  category: "neutral" | "comparative" | "branded";
  provenance: "model_generated_hypothesis";
  evidence_ids: [];
  popularity: null;
  accepted: false;
}
export interface AiTrackingSuggestionsGeneration {
  generation_id: `asg_${string}`;
  drafts: AiTrackingModelSuggestion[];
  cost_usd: string | null;
  cost_state: "unknown" | "confirmed";
  method: "model_generated_hypothesis";
  limitations: string[];
}
