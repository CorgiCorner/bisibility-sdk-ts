import type {
  AiTrackingSuggestionSnapshot,
  AiTrackingSuggestionsGenerateInput,
  AiTrackingSuggestionsGeneration,
  AiTrackingSuggestionsPreview,
  AiTrackingSuggestionsPreviewInput,
} from "./ai-tracking-suggestions.js";
import { type TrackingTransport, trackingId } from "./ai-tracking-transport.js";
import { BisibilityConfigurationError } from "./errors.js";
import type { DataResponse, ProjectId, RequestOptions } from "./types.js";

export function validateSuggestionSnapshot(snapshot: AiTrackingSuggestionSnapshot): void {
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
export function createAiTrackingSuggestionMethods(transport: TrackingTransport) {
  return {
    aiTrackingSuggestionsPreview(
      projectId: ProjectId,
      input: AiTrackingSuggestionsPreviewInput,
      options?: RequestOptions,
    ) {
      validateSuggestionSnapshot(input.input_snapshot);
      if (input.credential_connection_id) trackingId(input.credential_connection_id, "conn");
      return transport.request<DataResponse<AiTrackingSuggestionsPreview>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/suggestions/preview`,
        { ...options, body: input },
      );
    },
    aiTrackingSuggestionsGenerate(
      projectId: ProjectId,
      input: AiTrackingSuggestionsGenerateInput,
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
      return transport.request<DataResponse<AiTrackingSuggestionsGeneration>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/suggestions/generate`,
        { ...options, body: input },
      );
    },
  };
}
