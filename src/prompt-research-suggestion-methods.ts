import type { BisibilityClient } from "./client.js";
import { BisibilityConfigurationError } from "./errors.js";
import type {
  PromptResearchAcceptanceInput,
  PromptResearchSuggestionSnapshot,
  PromptResearchSuggestions,
  PromptResearchSuggestionsGenerateInput,
  PromptResearchSuggestionsGeneration,
  PromptResearchSuggestionsPreview,
  PromptResearchSuggestionsPreviewInput,
} from "./prompt-research-suggestions.js";
import {
  type TrackingTransport,
  trackingId,
  validateTrackingInput,
} from "./prompt-tracker-transport.js";
import type { PromptTrackerPrompt } from "./prompt-tracker.js";
import type { DataResponse, ProjectId, RequestOptions } from "./types.js";

export function validateSuggestionSnapshot(snapshot: PromptResearchSuggestionSnapshot): void {
  if (
    new Set(snapshot.competitors.map((competitor) => competitor.id)).size !==
    snapshot.competitors.length
  )
    throw new BisibilityConfigurationError("Reviewed competitors must have unique public IDs.");
  for (const competitor of snapshot.competitors) trackingId(competitor.id, "cmp");
  const { agent_rules, ...context } = snapshot.context;
  if (
    Array.from(
      JSON.stringify({
        context: { ...context, agentRules: agent_rules },
        competitors: snapshot.competitors,
      }),
    ).length > 5000
  )
    throw new BisibilityConfigurationError(
      "Reviewed input snapshot exceeds 5000 serialized characters.",
    );
}
export function createPromptResearchSuggestionMethods(transport: TrackingTransport) {
  return {
    promptResearchSuggestionsPreview(
      projectId: ProjectId,
      input: PromptResearchSuggestionsPreviewInput,
      options?: RequestOptions,
    ) {
      validateSuggestionSnapshot(input.input_snapshot);
      if (input.credential_connection_id) trackingId(input.credential_connection_id, "conn");
      return transport.request<DataResponse<PromptResearchSuggestionsPreview>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-research/suggestions/preview`,
        { ...options, body: input },
      );
    },
    promptResearchSuggestionsGenerate(
      projectId: ProjectId,
      input: PromptResearchSuggestionsGenerateInput,
      options?: RequestOptions,
    ) {
      validateSuggestionSnapshot(input.preview.input_snapshot);
      trackingId(input.preview.credential_connection_id, "conn");
      if (input.consent !== true)
        throw new BisibilityConfigurationError("Explicit model generation consent is required.");
      if (
        !options?.idempotencyKey ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          options.idempotencyKey,
        )
      )
        throw new BisibilityConfigurationError(
          "A stable UUID Idempotency-Key is required for model generation.",
        );
      return transport.request<DataResponse<PromptResearchSuggestionsGeneration>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-research/suggestions/generate`,
        { ...options, body: input },
      );
    },
    suggestPromptResearchPrompts(projectId: ProjectId, options?: RequestOptions) {
      return transport.request<DataResponse<PromptResearchSuggestions>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-research/suggestions`,
        { ...options, body: {} },
      );
    },
    acceptPromptResearchSuggestions(
      projectId: ProjectId,
      input: PromptResearchAcceptanceInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<{ prompts: PromptTrackerPrompt[] }>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-research/suggestions/accept`,
        { ...options, body: input },
      );
    },
  };
}
export type PromptResearchSuggestionMethods = ReturnType<
  typeof createPromptResearchSuggestionMethods
>;
export function installPromptResearchSuggestionMethods(
  client: BisibilityClient,
  transport: TrackingTransport,
) {
  for (const [name, method] of Object.entries(createPromptResearchSuggestionMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
