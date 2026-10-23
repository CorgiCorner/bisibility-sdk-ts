import { describe, expect, it, vi } from "vitest";
import { BisibilityClient, BisibilityConfigurationError } from "../src/index.js";
import { createPromptResearchSuggestionMethods } from "../src/prompt-research-suggestion-methods.js";
import { createPromptTrackerMethods } from "../src/prompt-tracker-methods.js";
import { hasPublicIdShape, validateTrackingInput } from "../src/prompt-tracker-transport.js";
import { validatePromptTrackerResponse } from "../src/prompt-tracker-validation.js";
import type { PromptTrackerRunInput, PromptTrackerTrends } from "../src/prompt-tracker.js";

const project = "prj_abcdefghijklmnopqrstuvwx";
const prompt = "aip_abcdefghijklmnopqrstuvwx";
const run = "air_abcdefghijklmnopqrstuvwx";
const configuration = {
  provider: "dataforseo" as const,
  endpoint: "consumer_scrape",
  engine: "chat_gpt" as const,
  source: "consumer_scrape" as const,
  model: null,
  parameters: {},
};
const preview = { prompt_ids: [prompt] as (typeof prompt)[], configurations: [configuration] };
const launch: PromptTrackerRunInput = {
  ...preview,
  credential_connection_id: "conn_abcdefghijklmnopqrstuvwx",
  credential_version: "v1",
  budget_revision: "b1",
  consent_revision: "c1",
  deadline: "2026-10-09T00:00:00Z",
  consent: true,
};

describe("tracking transport contracts", () => {
  it("keeps preview spend-free and binds launches to a header-only retry identity", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createPromptTrackerMethods({ request: request as never });
    await client.previewPromptTrackerRun(project, preview);
    await client.createPromptTrackerRun(project, launch, { idempotencyKey: "stable-key" });
    await client.retryPromptTrackerRun(project, run, launch, { idempotencyKey: "retry-key" });
    expect(request.mock.calls).toEqual([
      ["POST", `/projects/${project}/prompt-tracker/runs/preview`, { body: preview }],
      [
        "POST",
        `/projects/${project}/prompt-tracker/runs`,
        { body: launch, idempotencyKey: "stable-key" },
      ],
      [
        "POST",
        `/projects/${project}/prompt-tracker/runs/${run}/retry`,
        { body: launch, idempotencyKey: "retry-key" },
      ],
    ]);
  });
  it("preserves opaque cursors and both comparison run IDs", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({}));
    const client = createPromptTrackerMethods({ request: request as never });
    await client.listPromptTrackerSamples(project, run, { cursor: "opaque+/=", limit: 10 });
    await client.getPromptTrackerTrends(project, { run_id: run, previous_run_id: run });
    await client.exportPromptTrackerEvidence(project, { run_id: run });
    expect(request.mock.calls).toEqual([
      [
        "GET",
        `/projects/${project}/prompt-tracker/runs/${run}/samples`,
        { query: { cursor: "opaque+/=", limit: 10 } },
      ],
      [
        "GET",
        `/projects/${project}/prompt-tracker/trends`,
        { query: { run_id: run, previous_run_id: run } },
      ],
      [
        "GET",
        `/projects/${project}/prompt-tracker/export`,
        { query: { run_id: run }, parseAs: "json" },
      ],
    ]);
  });
  it("rejects wrong-resource IDs and missing launch identity before transport", () => {
    const request = vi.fn();
    const client = createPromptTrackerMethods({ request });
    expect(() => client.getPromptTrackerRun(project, prompt as never)).toThrow(
      BisibilityConfigurationError,
    );
    expect(() =>
      client.previewPromptTrackerRun(project, { ...preview, prompt_ids: [run as never] }),
    ).toThrow(BisibilityConfigurationError);
    expect(() => client.createPromptTrackerRun(project, launch)).toThrow("Idempotency-Key");
    expect(request).not.toHaveBeenCalled();
  });
  it("covers every catalog operation and forwards exact resource paths and payloads", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createPromptTrackerMethods({ request: request as never });
    const topic = "ait_abcdefghijklmnopqrstuvwx";
    const schedule = "ais_abcdefghijklmnopqrstuvwx";
    const topicInput = { name: "Neutral", paused: true };
    const promptInput = {
      text: "Example?",
      topic_id: topic as `ait_${string}`,
      category: "neutral" as const,
    };
    const draft = {
      ...promptInput,
      provenance: "generated_hypothesis" as const,
      evidence_ids: [],
      popularity: null,
      accepted: false as const,
    };
    const scheduleInput = {
      name: "Weekly",
      cron: "0 8 * * 1",
      timezone: "Etc/UTC",
      configuration: launch,
      enabled: false,
    };
    const cases = [
      [() => client.listPromptTrackerTopics(project), "GET", "topics", { query: {} }],
      [
        () => client.createPromptTrackerTopic(project, topicInput),
        "POST",
        "topics",
        { body: topicInput },
      ],
      [
        () => client.updatePromptTrackerTopic(project, topic, { paused: false }),
        "PATCH",
        `topics/${topic}`,
        { body: { paused: false } },
      ],
      [() => client.archivePromptTrackerTopic(project, topic), "DELETE", `topics/${topic}`, {}],
      [() => client.listPromptTrackerPrompts(project), "GET", "prompts", { query: {} }],
      [
        () => client.createPromptTrackerPrompt(project, promptInput),
        "POST",
        "prompts",
        { body: promptInput },
      ],
      [
        () => client.updatePromptTrackerPrompt(project, prompt, { text: "Revision?" }),
        "PATCH",
        `prompts/${prompt}`,
        { body: { text: "Revision?" } },
      ],
      [() => client.archivePromptTrackerPrompt(project, prompt), "DELETE", `prompts/${prompt}`, {}],
      [() => client.listPromptTrackerSchedules(project), "GET", "schedules", { query: {} }],
      [
        () => client.createPromptTrackerSchedule(project, scheduleInput),
        "POST",
        "schedules",
        { body: scheduleInput },
      ],
      [
        () => client.updatePromptTrackerSchedule(project, schedule, scheduleInput),
        "PATCH",
        `schedules/${schedule}`,
        { body: scheduleInput },
      ],
      [
        () => client.archivePromptTrackerSchedule(project, schedule),
        "DELETE",
        `schedules/${schedule}`,
        {},
      ],
      [() => client.listPromptTrackerRuns(project), "GET", "runs", { query: {} }],
      [() => client.getPromptTrackerRun(project, run), "GET", `runs/${run}`, {}],
      [() => client.cancelPromptTrackerRun(project, run), "POST", `runs/${run}/cancel`, {}],
      [() => client.getPromptTrackerHistory(project), "GET", "history", { query: {} }],
      [
        () => client.exportPromptTrackerEvidence(project, { run_id: run, format: "csv" }),
        "GET",
        "export",
        { query: { run_id: run, format: "csv" }, parseAs: "text" },
      ],
      [
        () => client.getPromptTrackerTrends(project, { run_id: run }),
        "GET",
        "trends",
        { query: { run_id: run } },
      ],
    ] as const;
    for (const [invoke, method, path, options] of cases) {
      await invoke();
      expect(request).toHaveBeenLastCalledWith(
        method,
        `/projects/${project}/prompt-tracker/${path}`,
        options,
      );
    }
    const research = createPromptResearchSuggestionMethods({ request: request as never });
    await research.suggestPromptResearchPrompts(project);
    expect(request).toHaveBeenLastCalledWith(
      "POST",
      `/projects/${project}/prompt-research/suggestions`,
      { body: {} },
    );
    await research.acceptPromptResearchSuggestions(project, { drafts: [draft] });
    expect(request).toHaveBeenLastCalledWith(
      "POST",
      `/projects/${project}/prompt-research/suggestions/accept`,
      { body: { drafts: [draft] } },
    );
    expect(() =>
      client.createPromptTrackerRun(project, { ...launch, consent: false } as never, {
        idempotencyKey: "stable",
      }),
    ).toThrow("consent");
    expect(() => client.retryPromptTrackerRun(project, run, launch)).toThrow("Idempotency-Key");
    expect(() =>
      client.retryPromptTrackerRun(project, run, { ...launch, consent: false } as never, {
        idempotencyKey: "stable",
      }),
    ).toThrow("consent");
    validateTrackingInput(null);
    expect(() => validateTrackingInput({ schedule_id: run })).toThrow("ais_");
  });
  it("checks runtime response IDs without mutating historical ID namespaces", () => {
    const base = `/projects/${project}/prompt-tracker`;
    validatePromptTrackerResponse("/projects", {});
    validatePromptTrackerResponse(`${base}/topics`, null);
    validatePromptTrackerResponse(`${base}/topics`, {
      data: [null, { id: "ait_abcdefghijklmnopqrstuvwx" }],
    });
    validatePromptTrackerResponse(`${base}/prompts`, {
      data: { id: prompt, topic_id: null, revisions: [{ id: "apr_abcdefghijklmnopqrstuvwx" }] },
    });
    validatePromptTrackerResponse(`${base}/schedules`, {
      data: { id: "ais_abcdefghijklmnopqrstuvwx" },
    });
    validatePromptTrackerResponse(`${base}/history`, { data: [{ id: run }] });
    validatePromptTrackerResponse(`${base}/runs/preview`, {
      data: { credential_connection_id: launch.credential_connection_id },
    });
    validatePromptTrackerResponse(`/projects/${project}/prompt-research/suggestions`, { data: {} });
    expect(() =>
      validatePromptTrackerResponse(`${base}/prompts`, { data: { id: prompt, topic_id: run } }),
    ).toThrow("ait_");
    expect(() => validatePromptTrackerResponse(`${base}/runs`, { data: { id: prompt } })).toThrow(
      "air_",
    );
    expect(() =>
      validatePromptTrackerResponse(`${base}/runs/${run}/samples`, {
        data: [{ id: "asm_abcdefghijklmnopqrstuvwx", prompt_revision_id: run }],
      }),
    ).toThrow("apr_");
  });
  it("exposes baseline, category and strata on the trends type to match the API contract", () => {
    // The API response includes baseline="neutral", category="neutral", and a strata array of
    // per-category denominator comparisons. The SDK type must preserve all three fields.
    const denominator = {
      expected: 10,
      observed: 9,
      eligible: 9,
      mentioned: 4,
      absent_aio: 0,
      partial: 1,
      failed: 1,
      unknown: 0,
      missing: 1,
      coverage: 0.9,
      mention_rate: 0.44,
    };
    const trends: PromptTrackerTrends = {
      current_run_id: run,
      previous_run_id: run,
      comparable: true,
      reason: null,
      current: denominator,
      previous: denominator,
      delta: 0,
      baseline: "neutral",
      category: "neutral",
      strata: [
        {
          category: "comparative",
          current: denominator,
          previous: denominator,
          comparable: true,
          reason: null,
          delta: 0,
        },
        {
          category: "branded",
          current: denominator,
          comparable: false,
          reason: "no previous run",
          delta: null,
        },
      ],
      next_cursor: null,
    };

    expect(trends.baseline).toBe("neutral");
    expect(trends.category).toBe("neutral");
    expect(trends.strata).toHaveLength(2);
    expect(trends.strata[0]?.category).toBe("comparative");
    expect(trends.strata[1]?.previous).toBeUndefined();
  });

  it("accepts a partial schedule patch with top-level consent for enable flows", async () => {
    // The API treats schedule PATCH as a partial of the create input and reads an explicit
    // top-level `consent` boolean (not nested inside `configuration`) when enabling.
    const schedule = "ais_abcdefghijklmnopqrstuvwx";
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createPromptTrackerMethods({ request: request as never });

    // Disable only.
    await client.updatePromptTrackerSchedule(project, schedule, { enabled: false });
    // Rename only.
    await client.updatePromptTrackerSchedule(project, schedule, { name: "Daily (renamed)" });
    // Enable with top-level consent and the run configuration the backend will approve.
    await client.updatePromptTrackerSchedule(project, schedule, {
      enabled: true,
      configuration: launch,
      consent: true,
    });

    expect(request.mock.calls).toEqual([
      [
        "PATCH",
        `/projects/${project}/prompt-tracker/schedules/${schedule}`,
        { body: { enabled: false } },
      ],
      [
        "PATCH",
        `/projects/${project}/prompt-tracker/schedules/${schedule}`,
        { body: { name: "Daily (renamed)" } },
      ],
      [
        "PATCH",
        `/projects/${project}/prompt-tracker/schedules/${schedule}`,
        { body: { enabled: true, configuration: launch, consent: true } },
      ],
    ]);
  });

  it("decodes unknown observations and null cost without manufacturing evidence", async () => {
    const sample = {
      id: "asm_abcdefghijklmnopqrstuvwx",
      prompt_revision_id: "apr_abcdefghijklmnopqrstuvwx",
      measurement: "unknown",
      source: "consumer_scrape",
      engine: "chat_gpt",
      prompt: "Example?",
      evidence: null,
      citations: [],
      cost_usd: null,
      cost_state: "unknown",
    };
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith("/capabilities")
        ? Response.json({ apiVersions: ["v1"], data: [] })
        : Response.json({ data: [sample], meta: { next_cursor: "opaque+/=" } }),
    );
    const client = new BisibilityClient({ apiKey: "bsb_key_test_x", fetch });
    const response = await client.listPromptTrackerSamples(project, run);
    expect(response.data[0]).toEqual(sample);
    expect(response.meta.next_cursor).toBe("opaque+/=");
  });
});

describe("hasPublicIdShape", () => {
  it("matches the same IDs as the former ^<prefix>_[a-z][a-z0-9]{23}$ pattern", () => {
    const body = "a".concat("b1".repeat(11), "c");
    expect(body).toHaveLength(24);
    expect(hasPublicIdShape(`air_${body}`, "air")).toBe(true);
    expect(hasPublicIdShape(`asm_${body}`, "air")).toBe(false);
    expect(hasPublicIdShape(`air_${body}x`, "air")).toBe(false);
    expect(hasPublicIdShape(`air_${body.slice(1)}`, "air")).toBe(false);
    expect(hasPublicIdShape(`air_1${body.slice(1)}`, "air")).toBe(false);
    expect(hasPublicIdShape(`air_${body.toUpperCase()}`, "air")).toBe(false);
    expect(hasPublicIdShape(`xair_${body}`, "air")).toBe(false);
  });
});
