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
  AiTrackingSchedulePatch,
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

export function createAiTrackingCatalogMethods(transport: TrackingTransport) {
  return {
    listAiTrackingTopics(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingTopic>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/topics`,
        { ...options, query: { ...input } },
      );
    },
    createAiTrackingTopic(
      projectId: ProjectId,
      input: AiTrackingTopicInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingTopic>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/topics`,
        { ...options, body: input },
      );
    },
    updateAiTrackingTopic(
      projectId: ProjectId,
      id: AiTrackingTopicId,
      input: Partial<AiTrackingTopicInput>,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingTopic>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/topics/${trackingId(id, "ait")}`,
        { ...options, body: input },
      );
    },
    archiveAiTrackingTopic(projectId: ProjectId, id: AiTrackingTopicId, options?: RequestOptions) {
      return transport.request<DataResponse<AiTrackingTopic>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/topics/${trackingId(id, "ait")}`,
        { ...options },
      );
    },
    listAiTrackingPrompts(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingPrompt>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/prompts`,
        { ...options, query: { ...input } },
      );
    },
    createAiTrackingPrompt(
      projectId: ProjectId,
      input: AiTrackingPromptInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingPrompt>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/prompts`,
        { ...options, body: input },
      );
    },
    updateAiTrackingPrompt(
      projectId: ProjectId,
      id: AiTrackingPromptId,
      input: Partial<AiTrackingPromptInput>,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingPrompt>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/prompts/${trackingId(id, "aip")}`,
        { ...options, body: input },
      );
    },
    archiveAiTrackingPrompt(
      projectId: ProjectId,
      id: AiTrackingPromptId,
      options?: RequestOptions,
    ) {
      return transport.request<DataResponse<AiTrackingPrompt>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/prompts/${trackingId(id, "aip")}`,
        { ...options },
      );
    },
    listAiTrackingSchedules(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<AiTrackingSchedule>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/schedules`,
        { ...options, query: { ...input } },
      );
    },
    createAiTrackingSchedule(
      projectId: ProjectId,
      input: AiTrackingScheduleInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingSchedule>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/schedules`,
        { ...options, body: input },
      );
    },
    updateAiTrackingSchedule(
      projectId: ProjectId,
      id: AiTrackingScheduleId,
      input: AiTrackingSchedulePatch,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<AiTrackingSchedule>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/schedules/${trackingId(id, "ais")}`,
        { ...options, body: input },
      );
    },
    archiveAiTrackingSchedule(
      projectId: ProjectId,
      id: AiTrackingScheduleId,
      options?: RequestOptions,
    ) {
      return transport.request<DataResponse<AiTrackingSchedule>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/ai-tracking/schedules/${trackingId(id, "ais")}`,
        { ...options },
      );
    },
  };
}
