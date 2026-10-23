import { BisibilityConfigurationError } from "./errors.js";
import type {
  PromptTrackerEvidenceOptions,
  PromptTrackerExport,
  PromptTrackerPreview,
  PromptTrackerPreviewInput,
  PromptTrackerPromptId,
  PromptTrackerPromptInput,
  PromptTrackerRun,
  PromptTrackerRunId,
  PromptTrackerRunInput,
  PromptTrackerSample,
  PromptTrackerSchedule,
  PromptTrackerScheduleId,
  PromptTrackerScheduleInput,
  PromptTrackerTopic,
  PromptTrackerTopicId,
  PromptTrackerTopicInput,
  PromptTrackerTrendOptions,
  PromptTrackerTrends,
} from "./prompt-tracker.js";
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
} from "./prompt-tracker-transport.js";

export function createPromptTrackerRunMethods(transport: TrackingTransport) {
  return {
    previewPromptTrackerRun(
      projectId: ProjectId,
      input: PromptTrackerPreviewInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerPreview>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs/preview`,
        { ...options, body: input },
      );
    },
    createPromptTrackerRun(
      projectId: ProjectId,
      input: PromptTrackerRunInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      if (input.consent !== true)
        throw new BisibilityConfigurationError("Explicit tracking consent is required.");
      if (!options?.idempotencyKey)
        throw new BisibilityConfigurationError("Idempotency-Key is required for tracking launch.");
      return transport.request<DataResponse<PromptTrackerRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs`,
        { ...options, body: input },
      );
    },
    listPromptTrackerRuns(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs`,
        { ...options, query: { ...input } },
      );
    },
    getPromptTrackerRun(projectId: ProjectId, id: PromptTrackerRunId, options?: RequestOptions) {
      return transport.request<DataResponse<PromptTrackerRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs/${trackingId(id, "air")}`,
        { ...options },
      );
    },
    listPromptTrackerSamples(
      projectId: ProjectId,
      id: PromptTrackerRunId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerSample>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs/${trackingId(id, "air")}/samples`,
        { ...options, query: { ...input } },
      );
    },
    cancelPromptTrackerRun(projectId: ProjectId, id: PromptTrackerRunId, options?: RequestOptions) {
      return transport.request<DataResponse<PromptTrackerRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs/${trackingId(id, "air")}/cancel`,
        { ...options },
      );
    },
    retryPromptTrackerRun(
      projectId: ProjectId,
      id: PromptTrackerRunId,
      input: PromptTrackerRunInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      if (input.consent !== true)
        throw new BisibilityConfigurationError("Explicit tracking consent is required.");
      if (!options?.idempotencyKey)
        throw new BisibilityConfigurationError("Idempotency-Key is required for tracking retry.");
      return transport.request<DataResponse<PromptTrackerRun>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/runs/${trackingId(id, "air")}/retry`,
        { ...options, body: input },
      );
    },
    getPromptTrackerHistory(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerRun>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/history`,
        { ...options, query: { ...input } },
      );
    },
    getPromptTrackerTrends(
      projectId: ProjectId,
      input: PromptTrackerTrendOptions,
      options?: RequestOptions,
    ) {
      trackingId(input.run_id, "air");
      if (input.previous_run_id) trackingId(input.previous_run_id, "air");
      return transport.request<DataResponse<PromptTrackerTrends>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/trends`,
        { ...options, query: { ...input } },
      );
    },
    exportPromptTrackerEvidence(
      projectId: ProjectId,
      input: PromptTrackerEvidenceOptions,
      options?: RequestOptions,
    ) {
      trackingId(input.run_id, "air");
      return transport.request<DataResponse<PromptTrackerExport> | string>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/export`,
        { ...options, query: { ...input }, parseAs: input.format === "csv" ? "text" : "json" },
      );
    },
  };
}
