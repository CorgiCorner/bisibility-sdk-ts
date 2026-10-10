import type {
  AiTrackingAcceptanceInput,
  AiTrackingEvidenceOptions,
  AiTrackingExport,
  AiTrackingPreview,
  AiTrackingPreviewInput,
  AiTrackingPrompt,
  AiTrackingPromptId,
  AiTrackingPromptInput,
  AiTrackingRun,
  AiTrackingRunId,
  AiTrackingRunInput,
  AiTrackingSample,
  AiTrackingSchedule,
  AiTrackingScheduleId,
  AiTrackingScheduleInput,
  AiTrackingSuggestions,
  AiTrackingTopic,
  AiTrackingTopicId,
  AiTrackingTopicInput,
  AiTrackingTrendOptions,
  AiTrackingTrends,
} from "./ai-tracking.js";
import { BisibilityConfigurationError } from "./errors.js";
import type {
  DataResponse,
  ListResponse,
  PaginationOptions,
  ProjectId,
  RequestOptions,
} from "./types.js";

import {
  type TrackingTransport,
  trackingId,
  validateTrackingInput,
} from "./ai-tracking-transport.js";

export function createAiTrackingRunMethods(transport: TrackingTransport) {
  return {
    previewAiTrackingRun(
      projectId: ProjectId,
      input: AiTrackingPreviewInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingPreview>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs/preview`,
        { ...options, body: input },
      );
    },
    createAiTrackingRun(projectId: ProjectId, input: AiTrackingRunInput, options?: RequestOptions) {
      validateTrackingInput(input);
      if (input.consent !== true)
        throw new BisibilityConfigurationError("Explicit tracking consent is required.");
      if (!options?.idempotencyKey)
        throw new BisibilityConfigurationError("Idempotency-Key is required for tracking launch.");
      return transport.request<DataResponse<AiTrackingRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs`,
        { ...options, body: input },
      );
    },
    listAiTrackingRuns(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs`,
        { ...options, query: { ...input } },
      );
    },
    getAiTrackingRun(projectId: ProjectId, id: AiTrackingRunId, options?: RequestOptions) {
      return transport.request<DataResponse<AiTrackingRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs/${trackingId(id, "air")}`,
        { ...options },
      );
    },
    listAiTrackingSamples(
      projectId: ProjectId,
      id: AiTrackingRunId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingSample>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs/${trackingId(id, "air")}/samples`,
        { ...options, query: { ...input } },
      );
    },
    cancelAiTrackingRun(projectId: ProjectId, id: AiTrackingRunId, options?: RequestOptions) {
      return transport.request<DataResponse<AiTrackingRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs/${trackingId(id, "air")}/cancel`,
        { ...options },
      );
    },
    retryAiTrackingRun(
      projectId: ProjectId,
      id: AiTrackingRunId,
      input: AiTrackingRunInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      if (input.consent !== true)
        throw new BisibilityConfigurationError("Explicit tracking consent is required.");
      if (!options?.idempotencyKey)
        throw new BisibilityConfigurationError("Idempotency-Key is required for tracking retry.");
      return transport.request<DataResponse<AiTrackingRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/runs/${trackingId(id, "air")}/retry`,
        { ...options, body: input },
      );
    },
    getAiTrackingHistory(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/history`,
        { ...options, query: { ...input } },
      );
    },
    getAiTrackingTrends(
      projectId: ProjectId,
      input: AiTrackingTrendOptions,
      options?: RequestOptions,
    ) {
      trackingId(input.run_id, "air");
      if (input.previous_run_id) trackingId(input.previous_run_id, "air");
      return transport.request<DataResponse<AiTrackingTrends>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/trends`,
        { ...options, query: { ...input } },
      );
    },
    exportAiTrackingEvidence(
      projectId: ProjectId,
      input: AiTrackingEvidenceOptions,
      options?: RequestOptions,
    ) {
      trackingId(input.run_id, "air");
      return transport.request<DataResponse<AiTrackingExport> | string>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/export`,
        { ...options, query: { ...input }, parseAs: input.format === "csv" ? "text" : "json" },
      );
    },
    suggestAiTrackingPrompts(projectId: ProjectId, options?: RequestOptions) {
      return transport.request<DataResponse<AiTrackingSuggestions>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/suggestions`,
        { ...options, body: {} },
      );
    },
    acceptAiTrackingSuggestions(
      projectId: ProjectId,
      input: AiTrackingAcceptanceInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<{ prompts: AiTrackingPrompt[] }>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/suggestions/accept`,
        { ...options, body: input },
      );
    },
  };
}
