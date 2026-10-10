import { describe, expect, it, vi } from "vitest";
import { createAiTrackingMethods } from "../src/ai-tracking-methods.js";
import type { AiTrackingSuggestionsPreview } from "../src/ai-tracking-suggestions.js";
import { BisibilityClient, BisibilityConfigurationError } from "../src/index.js";

const project = "prj_abcdefghijklmnopqrstuvwx";
const key = "11111111-1111-4111-8111-111111111111";
const input = {
  configuration: {
    provider: "dataforseo" as const,
    engine: "chat_gpt" as const,
    model: "gpt-5-mini",
    language_code: "en",
    max_output_tokens: 1024,
    advisory_cost_limit_cents: 50,
  },
  input_snapshot: {
    context: {
      business: "Example",
      audience: "Teams",
      products: "Analytics",
      goals: "Visibility",
      agent_rules: "Review claims",
    },
    competitors: [
      {
        id: "cmp_abcdefghijklmnopqrstuvwx" as const,
        label: null,
        domain: "competitor.example.com",
      },
    ],
  },
};
const preview: AiTrackingSuggestionsPreview = {
  ...input,
  version: 1,
  snapshot_hash: "a".repeat(64),
  estimated_cost_cents: 0.5,
  estimate_kind: "forecast",
  is_guaranteed_maximum: false,
  credential_connection_id: "conn_abcdefghijklmnopqrstuvwx",
  credential_version: "v1",
  budget_revision: "b1",
  consent_revision: "c1",
  expires_at: "2026-10-08T23:00:00Z",
  limitations: ["Forecast has no guaranteed maximum"],
};

describe("model suggestion client contract", () => {
  it("retains additive bounded export scope", async () => {
    const scope = { complete: false, max_pages: 20, loaded: 1000, resumed: true };
    const request = vi.fn(async () => ({
      data: { items: [], run_id: "air_abcdefghijklmnopqrstuvwx", next_cursor: "resume", scope },
    }));
    const client = createAiTrackingMethods({ request: request as never });
    const result = await client.exportAiTrackingEvidence(project, {
      run_id: "air_abcdefghijklmnopqrstuvwx",
    });
    expect(typeof result === "string" ? null : result.data.scope).toEqual(scope);
  });
  it("forwards the exact reviewed preview and header-only stable UUID", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createAiTrackingMethods({ request: request as never });
    await client.aiTrackingSuggestionsPreview(project, input);
    await client.aiTrackingSuggestionsGenerate(
      project,
      { preview, consent: true },
      { idempotencyKey: key },
    );
    expect(request.mock.calls).toEqual([
      ["POST", `/projects/${project}/ai-tracking/suggestions/preview`, { body: input }],
      [
        "POST",
        `/projects/${project}/ai-tracking/suggestions/generate`,
        { idempotencyKey: key, body: { preview, consent: true } },
      ],
    ]);
  });
  it("rejects oversized review, duplicate competitors, fake provenance and missing consent before transport", () => {
    const request = vi.fn();
    const client = createAiTrackingMethods({ request });
    expect(() =>
      client.aiTrackingSuggestionsPreview(project, {
        ...input,
        input_snapshot: {
          ...input.input_snapshot,
          context: { ...input.input_snapshot.context, business: "x".repeat(5000) },
        },
      }),
    ).toThrow("5000");
    expect(() =>
      client.aiTrackingSuggestionsPreview(project, {
        ...input,
        input_snapshot: {
          ...input.input_snapshot,
          competitors: [...input.input_snapshot.competitors, ...input.input_snapshot.competitors],
        },
      }),
    ).toThrow("unique");
    expect(() => client.aiTrackingSuggestionsGenerate(project, { preview, consent: true })).toThrow(
      "UUID",
    );
    expect(() =>
      client.aiTrackingSuggestionsGenerate(project, { preview, consent: false } as never, {
        idempotencyKey: key,
      }),
    ).toThrow("consent");
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [
          { text: "Example?", category: "neutral", provenance: "model_generated_hypothesis" },
        ],
      }),
    ).toThrow("generation reference");
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [{ text: "Example?", category: "neutral", provenance: "provider_dataset" }],
      }),
    ).toThrow("report reference");
    expect(request).not.toHaveBeenCalled();
  });
  it("counts reviewed Unicode characters and preserves edited trusted references", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createAiTrackingMethods({ request: request as never });
    await client.aiTrackingSuggestionsPreview(project, {
      ...input,
      input_snapshot: {
        ...input.input_snapshot,
        context: { ...input.input_snapshot.context, business: "🐕".repeat(2400) },
      },
    });
    const draft = {
      text: "Edited hypothesis?",
      category: "comparative" as const,
      generation_reference: {
        generation_id: "asg_abcdefghijklmnopqrstuvwx" as const,
        draft_id: key,
      },
    };
    await client.acceptAiTrackingSuggestions(project, { drafts: [draft] });
    expect(request).toHaveBeenLastCalledWith(
      "POST",
      `/projects/${project}/ai-tracking/suggestions/accept`,
      { body: { drafts: [draft] } },
    );
  });
  it("validates trusted dataset rows and generation references before acceptance", async () => {
    const request = vi.fn(async (..._args: unknown[]) => ({ data: {} }));
    const client = createAiTrackingMethods({ request: request as never });
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [{ text: "Fake popularity?", category: "neutral", popularity: 100 } as never],
      }),
    ).toThrow("popularity");
    const base = {
      text: "Dataset prompt?",
      category: "neutral" as const,
      provenance: "provider_dataset" as const,
      provider_dataset_reference: {
        report_id: "agr_abcdefghijklmnopqrstuvwx" as const,
        row_index: 0,
      },
    };
    await client.acceptAiTrackingSuggestions(project, { drafts: [base] });
    await client.aiTrackingSuggestionsPreview(project, {
      ...input,
      credential_connection_id: preview.credential_connection_id,
    });
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [
          {
            ...base,
            provider_dataset_reference: { ...base.provider_dataset_reference, row_index: -1 },
          },
        ],
      }),
    ).toThrow("nonnegative");
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [
          {
            ...base,
            generation_reference: { generation_id: "asg_abcdefghijklmnopqrstuvwx", draft_id: key },
          },
        ],
      }),
    ).toThrow("one trusted");
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [{ text: "Unverified?", category: "neutral", evidence_ids: ["fake"] }],
      }),
    ).toThrow("Evidence claims");
    expect(() =>
      client.acceptAiTrackingSuggestions(project, {
        drafts: [
          {
            text: "Model?",
            category: "neutral",
            generation_reference: {
              generation_id: "asg_abcdefghijklmnopqrstuvwx",
              draft_id: "fake",
            },
          },
        ],
      }),
    ).toThrow("UUID");
    expect(() =>
      client.aiTrackingSuggestionsPreview(project, {
        ...input,
        credential_connection_id: "air_abcdefghijklmnopqrstuvwx" as never,
      }),
    ).toThrow("conn_");
  });
  it("retains unknown cost and model hypothesis metadata when decoding the API response", async () => {
    const result = {
      generation_id: "asg_abcdefghijklmnopqrstuvwx",
      drafts: [
        {
          draft_id: key,
          text: "Example?",
          category: "neutral",
          provenance: "model_generated_hypothesis",
          evidence_ids: [],
          popularity: null,
          accepted: false,
        },
      ],
      cost_usd: null,
      cost_state: "unknown",
      method: "model_generated_hypothesis",
      limitations: [],
    };
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith("/capabilities")
        ? Response.json({ apiVersions: ["v1"], data: [] })
        : Response.json({ data: result }),
    );
    const client = new BisibilityClient({ apiKey: "bsb_key_test_x", fetch });
    expect(
      (
        await client.aiTrackingSuggestionsGenerate(
          project,
          { preview, consent: true },
          { idempotencyKey: key },
        )
      ).data,
    ).toEqual(result);
    result.generation_id = "air_abcdefghijklmnopqrstuvwx";
    await expect(
      client.aiTrackingSuggestionsGenerate(
        project,
        { preview, consent: true },
        { idempotencyKey: key },
      ),
    ).rejects.toThrow();
    expect(BisibilityConfigurationError).toBeDefined();
  });
});
