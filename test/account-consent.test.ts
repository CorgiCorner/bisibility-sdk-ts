import { describe, expect, it, vi } from "vitest";
import { BisibilityApiError, BisibilityClient, BisibilityResponseError } from "../src/index.js";

const pending = { analytics: false, decided_at: null, source: null, version: 2 };
function setup(body: unknown = pending, status = 200) {
  const operation = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const client = new BisibilityClient({
    apiKey: "bsb_pat_live_fixture",
    baseUrl: "https://api.test/api/v1",
    maxRetries: 0,
    fetch: async (url, init) =>
      String(url).endsWith("/capabilities")
        ? new Response(JSON.stringify({ apiVersions: ["v1"], data: [] }))
        : operation(url, init),
  });
  return { client, operation };
}
describe("account analytics consent", () => {
  it("reads pending permission without inventing a decision or browser replay", async () => {
    const { client, operation } = setup();
    expect(await client.account.analyticsConsent.get()).toEqual(pending);
    const [url, init] = operation.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.test/api/v1/me/analytics-consent");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer bsb_pat_live_fixture");
  });
  it.each([false, true])("writes the explicit analytics boolean %s only", async (analytics) => {
    const saved = { analytics, decided_at: "2026-10-18T12:00:00.000Z", source: "api", version: 2 };
    const { client, operation } = setup(saved);
    expect(
      await client.account.analyticsConsent.update(
        { analytics },
        { idempotencyKey: "consent-fixture" },
      ),
    ).toEqual(saved);
    const [, init] = operation.mock.calls[0] ?? [];
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ analytics });
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("consent-fixture");
  });
  it.each([
    { ...pending, analytics: "false" },
    { ...pending, source: "other" },
    { analytics: false, source: null, version: 2 },
  ])("rejects malformed success permission %j", async (body) => {
    await expect(setup(body).client.getAnalyticsConsent()).rejects.toBeInstanceOf(
      BisibilityResponseError,
    );
  });
  it("preserves authorization errors without synthesizing a permission", async () => {
    const { client } = setup({ type: "about:blank", title: "Forbidden", status: 403 }, 403);
    await expect(client.updateAnalyticsConsent({ analytics: false })).rejects.toBeInstanceOf(
      BisibilityApiError,
    );
  });
});
