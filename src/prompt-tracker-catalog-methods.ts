import { BisibilityConfigurationError } from "./errors.js";
import type {
  PromptTrackerEvidenceOptions,
  PromptTrackerExport,
  PromptTrackerPreview,
  PromptTrackerPreviewInput,
  PromptTrackerPrompt,
  PromptTrackerPromptId,
  PromptTrackerPromptInput,
  PromptTrackerRun,
  PromptTrackerRunId,
  PromptTrackerRunInput,
  PromptTrackerSample,
  PromptTrackerSchedule,
  PromptTrackerScheduleId,
  PromptTrackerScheduleInput,
  PromptTrackerSchedulePatch,
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

export function createPromptTrackerCatalogMethods(transport: TrackingTransport) {
  return {
    listPromptTrackerTopics(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerTopic>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/topics`,
        { ...options, query: { ...input } },
      );
    },
    createPromptTrackerTopic(
      projectId: ProjectId,
      input: PromptTrackerTopicInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerTopic>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/topics`,
        { ...options, body: input },
      );
    },
    updatePromptTrackerTopic(
      projectId: ProjectId,
      id: PromptTrackerTopicId,
      input: Partial<PromptTrackerTopicInput>,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerTopic>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/topics/${trackingId(id, "ait")}`,
        { ...options, body: input },
      );
    },
    archivePromptTrackerTopic(
      projectId: ProjectId,
      id: PromptTrackerTopicId,
      options?: RequestOptions,
    ) {
      return transport.request<DataResponse<PromptTrackerTopic>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/topics/${trackingId(id, "ait")}`,
        { ...options },
      );
    },
    listPromptTrackerPrompts(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerPrompt>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/prompts`,
        { ...options, query: { ...input } },
      );
    },
    createPromptTrackerPrompt(
      projectId: ProjectId,
      input: PromptTrackerPromptInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerPrompt>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/prompts`,
        { ...options, body: input },
      );
    },
    updatePromptTrackerPrompt(
      projectId: ProjectId,
      id: PromptTrackerPromptId,
      input: Partial<PromptTrackerPromptInput>,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerPrompt>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/prompts/${trackingId(id, "aip")}`,
        { ...options, body: input },
      );
    },
    archivePromptTrackerPrompt(
      projectId: ProjectId,
      id: PromptTrackerPromptId,
      options?: RequestOptions,
    ) {
      return transport.request<DataResponse<PromptTrackerPrompt>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/prompts/${trackingId(id, "aip")}`,
        { ...options },
      );
    },
    listPromptTrackerSchedules(
      projectId: ProjectId,
      input: PaginationOptions = {},
      options?: RequestOptions,
    ) {
      return transport.request<ListResponse<PromptTrackerSchedule>>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/schedules`,
        { ...options, query: { ...input } },
      );
    },
    createPromptTrackerSchedule(
      projectId: ProjectId,
      input: PromptTrackerScheduleInput,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerSchedule>>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/schedules`,
        { ...options, body: input },
      );
    },
    updatePromptTrackerSchedule(
      projectId: ProjectId,
      id: PromptTrackerScheduleId,
      input: PromptTrackerSchedulePatch,
      options?: RequestOptions,
    ) {
      validateTrackingInput(input);
      return transport.request<DataResponse<PromptTrackerSchedule>>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/schedules/${trackingId(id, "ais")}`,
        { ...options, body: input },
      );
    },
    archivePromptTrackerSchedule(
      projectId: ProjectId,
      id: PromptTrackerScheduleId,
      options?: RequestOptions,
    ) {
      return transport.request<DataResponse<PromptTrackerSchedule>>(
        "DELETE",
        `/projects/${trackingId(projectId, "prj")}/prompt-tracker/schedules/${trackingId(id, "ais")}`,
        { ...options },
      );
    },
  };
}
