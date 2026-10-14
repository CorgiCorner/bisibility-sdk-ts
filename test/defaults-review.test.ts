import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityResponseError,
} from "../src/index.js";
const f = JSON.parse(
  readFileSync(new URL("./fixtures/defaults-review.json", import.meta.url), "utf8"),
);
function harness(
  body: unknown = f.preview,
  status = 200,
  failures = 0,
  capabilities: unknown = {
    apiVersions: ["v1"],
    data: [],
    features: { reviewed_project_defaults: "v1" },
  },
) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const requests: URL[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_fixture",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: failures,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname.endsWith("/capabilities")) return Response.json(capabilities);
      calls.push({ url, init: init ?? {} });
      if (calls.length <= failures) throw new TypeError("synthetic lost response");
      return Response.json(body, { status });
    },
  });
  return { client, calls, requests };
}
const review = {
  expected_source_hash: f.preview.expected_source_hash,
  expected_revision: f.preview.expected_revision,
  preview_token: f.preview.preview_token,
  idempotency_key: "same-reviewed-command",
  confirmed: true as const,
};
describe("reviewed project defaults", () => {
  it("previews through existing PATCH without writes or automatic confirmation", async () => {
    const { client, calls } = harness();
    expect(await client.projects.previewDefaults(f.project, f.patch)).toEqual(f.preview);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.searchParams.get("preview_only")).toBe("true");
    expect(calls[0]?.init.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(f.patch);
  });
  it("retries the same explicit reviewed command and preserves string epochs", async () => {
    const { client, calls } = harness(f.saved, 200, 1);
    expect(await client.projects.updateDefaults(f.project, { ...f.patch, review })).toEqual(
      f.saved,
    );
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url.search).toBe("");
      expect(new Headers(call.init.headers).get("Idempotency-Key")).toBe(review.idempotency_key);
      expect(JSON.parse(String(call.init.body))).toEqual({ ...f.patch, review });
    }
  });
  it("rejects incomplete or contradictory confirmation before fetch", async () => {
    const { client, calls } = harness();
    for (const changed of [
      { confirmed: false },
      { expected_revision: 9007199254740992 },
      { expected_revision: "01" },
      { preview_token: "" },
      { preview_token: "x".repeat(8193) },
      { idempotency_key: "short" },
      { idempotency_key: "x".repeat(129) },
      { expected_source_hash: "x" },
      { extra: true },
    ])
      await expect(async () =>
        client.updateProjectDefaults(f.project, { ...f.patch, review: { ...review, ...changed } }),
      ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    await expect(async () =>
      client.updateProjectDefaults(
        f.project,
        { ...f.patch, review },
        { idempotencyKey: "different-command" },
      ),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    await expect(async () =>
      client.previewProjectDefaults(f.project, { ...f.patch, review }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(calls).toHaveLength(0);
  });
  it("rejects wrong response kind, foreign project and numeric revision", async () => {
    for (const body of [
      f.saved,
      { ...f.preview, expected_revision: 1 },
      { ...f.preview, expected_revision: "01" },
      { ...f.preview, expected_source_hash: "invalid" },
      { ...f.preview, preview_token: "" },
      { ...f.preview, preview_token: "x".repeat(8193) },
      { ...f.preview, expires_at: "invalid" },
      {
        ...f.preview,
        request: {
          ...f.preview.request,
          values: { ...f.preview.request.values, project_id: `prj_${"b".repeat(24)}` },
        },
      },
      { ...f.preview, draft: { ...f.preview.draft, project_id: `prj_${"b".repeat(24)}` } },
    ])
      await expect(
        harness(body).client.previewProjectDefaults(f.project, f.patch),
      ).rejects.toBeInstanceOf(BisibilityResponseError);
    await expect(
      harness(f.preview).client.updateProjectDefaults(f.project, { ...f.patch, review }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
  it("preserves future output metadata, additional fields and unknown recurring estimate", async () => {
    const body = {
      ...f.preview,
      impact: { ...f.preview.impact, recurring_estimate: "future_unknown" },
      extra: true,
    };
    expect(await harness(body).client.previewProjectDefaults(f.project, f.patch)).toEqual(body);
  });
  it.each([401, 403, 409, 428])(
    "preserves server refusal %s without confirming or retrying",
    async (status) => {
      const { client, calls } = harness(
        {
          type: "about:blank",
          title: "Refused",
          status,
          detail: "Review denied",
          reason: "preview_required",
        },
        status,
      );
      await expect(
        client.updateProjectDefaults(f.project, { ...f.patch, review }),
      ).rejects.toMatchObject({ status });
      expect(calls).toHaveLength(1);
    },
  );
});

it("never PATCHes legacy, missing, malformed or unknown reviewed-defaults servers", async () => {
  for (const features of [
    undefined,
    null,
    "v1",
    {},
    { reviewed_project_defaults: true },
    { reviewed_project_defaults: "v2" },
  ]) {
    const h = harness(f.saved, 200, 0, {
      apiVersions: ["v1"],
      data: [],
      ...(features === undefined ? {} : { features }),
    });
    await expect(h.client.previewProjectDefaults(f.project, f.patch)).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    await expect(
      h.client.updateProjectDefaults(f.project, { ...f.patch, review }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(h.calls).toHaveLength(0);
  }
});
it("preserves ordinary legacy updates without requiring the new marker", async () => {
  const h = harness(f.saved, 200, 0, { apiVersions: ["v1"], data: [] });
  expect(await h.client.updateProjectDefaults(f.project, f.patch)).toEqual(f.saved);
  expect(h.calls).toHaveLength(1);
});

it("rejects invalid reviewed project scopes before the capability request", async () => {
  const { client, requests } = harness();
  await expect(client.previewProjectDefaults("prj_invalid", f.patch)).rejects.toBeInstanceOf(
    BisibilityConfigurationError,
  );
  await expect(
    client.updateProjectDefaults("prj_invalid", { ...f.patch, review }),
  ).rejects.toBeInstanceOf(BisibilityConfigurationError);
  expect(requests).toHaveLength(0);
});

it("accepts additive request metadata on ordinary defaults reads and saves", async () => {
  const body = { ...f.saved, request: null };
  const { client } = harness(body);
  expect(await client.projects.getDefaults(f.project)).toEqual(body);
  expect(await client.projects.updateDefaults(f.project, f.patch)).toEqual(body);
  expect(await client.projects.updateDefaults(f.project, { ...f.patch, review })).toEqual(body);
});

it("preserves legacy capabilities and updates while unsupported feature markers fail closed", async () => {
  for (const features of [
    null,
    "v1",
    {},
    { reviewed_project_defaults: true },
    { reviewed_project_defaults: "v2" },
  ]) {
    const capabilities = { apiVersions: ["v1"], data: [], features };
    const { client, calls } = harness(f.saved, 200, 0, capabilities);
    expect(await client.getCapabilities()).toEqual(capabilities);
    expect(await client.updateProjectDefaults(f.project, f.patch)).toEqual(f.saved);
    calls.length = 0;
    await expect(client.previewProjectDefaults(f.project, f.patch)).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    await expect(
      client.updateProjectDefaults(f.project, { ...f.patch, review }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
    expect(calls).toHaveLength(0);
  }
});

it("keeps preview responses out of the commit's idempotency bucket at every header layer", async () => {
  const cache = new Map<string, unknown>();
  const mutations: { url: URL; key: string | null }[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_fixture",
    baseUrl: "https://api.example.com/api/v1",
    headers: { "iDeMpOtEnCy-KeY": review.idempotency_key },
    maxRetries: 0,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/capabilities"))
        return Response.json({
          apiVersions: ["v1"],
          data: [],
          features: { reviewed_project_defaults: "v1" },
        });
      const key = new Headers(init?.headers).get("Idempotency-Key");
      mutations.push({ url, key });
      // The mutation replay bucket scopes method and pathname, without the query string.
      const scope = `${init?.method}:${url.pathname}:${key}`;
      if (key && cache.has(scope)) return Response.json(cache.get(scope));
      const body = url.searchParams.get("preview_only") === "true" ? f.preview : f.saved;
      if (key) cache.set(scope, body);
      return Response.json(body);
    },
  });
  expect(
    await client.projects.previewDefaults(f.project, f.patch, {
      idempotencyKey: review.idempotency_key,
      headers: { "idempotency-key": review.idempotency_key },
    }),
  ).toEqual(f.preview);
  expect(mutations[0]?.key).toBeNull();
  expect(await client.projects.updateDefaults(f.project, { ...f.patch, review })).toEqual(f.saved);
  expect(mutations[1]?.key).toBe(review.idempotency_key);
});

it("rejects header-invalid or whitespace-altered reviewed keys before transport", async () => {
  const { client, requests } = harness(f.saved);
  for (const idempotency_key of ["確認-command-key", "review\ncommand-key", "review\rcommand-key"])
    await expect(
      client.updateProjectDefaults(f.project, {
        ...f.patch,
        review: { ...review, idempotency_key },
      }),
    ).rejects.toBeInstanceOf(BisibilityConfigurationError);
  expect(requests).toHaveLength(0);
  const h = harness(f.saved);
  await expect(
    h.client.updateProjectDefaults(
      f.project,
      {
        ...f.patch,
        review: { ...review, idempotency_key: ` ${review.idempotency_key} ` },
      },
      { idempotencyKey: ` ${review.idempotency_key} ` },
    ),
  ).rejects.toBeInstanceOf(BisibilityConfigurationError);
  expect(h.requests).toHaveLength(0);
});
