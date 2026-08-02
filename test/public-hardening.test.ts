import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BisibilityClient } from "../src/client.js";
import {
  BisibilityApiError,
  BisibilityConfigurationError,
  BisibilityError,
  BisibilityNetworkError,
  BisibilityResponseError,
} from "../src/errors.js";
import { SDK_VERSION } from "../src/version.js";

const apiKey = "bsb_key_test_x";
const baseUrl = "https://api.test/api/v1";
const emptyPage = { data: [], meta: { next_cursor: null } };

function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) },
    status,
  });
}

function empty(status: number, headers: HeadersInit = {}) {
  return new Response(null, { headers: new Headers(headers), status });
}

function client(
  fetchImpl: typeof globalThis.fetch,
  options: { maxRetries?: number; timeout?: number | null } = {},
) {
  return new BisibilityClient({
    apiKey,
    baseUrl,
    fetch: matchingApiVersionFetch(fetchImpl),
    ...options,
  });
}

function matchingApiVersionFetch(fetchImpl: typeof globalThis.fetch): typeof globalThis.fetch {
  return (input, init) =>
    String(input).endsWith("/capabilities")
      ? Promise.resolve(json({ apiVersions: ["v1"], data: [] }))
      : fetchImpl(input, init);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SDK version", () => {
  it("keeps SDK_VERSION synchronized with package.json", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(SDK_VERSION).toBe(packageJson.version);
  });
});

describe("BisibilityApiError helpers", () => {
  it("reports rate-limit, not-found, and numeric Retry-After", () => {
    const rateLimit = new BisibilityApiError("slow down", {
      body: "",
      headers: new Headers({ "Retry-After": "120" }),
      method: "GET",
      problem: undefined,
      status: 429,
      url: baseUrl,
    });

    expect(rateLimit).toBeInstanceOf(BisibilityError);
    expect(rateLimit.isRateLimit).toBe(true);
    expect(rateLimit.isNotFound).toBe(false);
    expect(rateLimit.retryAfterSeconds).toBe(60);
  });

  it("parses an HTTP-date Retry-After and flags not-found", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
    const notFound = new BisibilityApiError("missing", {
      body: "",
      headers: new Headers({ "Retry-After": "Tue, 14 Jul 2026 12:00:30 GMT" }),
      method: "GET",
      problem: undefined,
      status: 404,
      url: baseUrl,
    });

    expect(notFound.isRateLimit).toBe(false);
    expect(notFound.isNotFound).toBe(true);
    expect(notFound.retryAfterSeconds).toBe(30);
  });

  it("returns null for unparseable or negative Retry-After", () => {
    const unparseable = new BisibilityApiError("invalid", {
      body: undefined,
      headers: new Headers({ "Retry-After": "later" }),
      method: "GET",
      problem: undefined,
      status: 500,
      url: baseUrl,
    });
    const negative = new BisibilityApiError("negative", {
      body: undefined,
      headers: new Headers({ "Retry-After": "-1" }),
      method: "GET",
      problem: undefined,
      status: 500,
      url: baseUrl,
    });
    const missing = new BisibilityApiError("no header", {
      body: undefined,
      headers: new Headers(),
      method: "GET",
      problem: undefined,
      status: 500,
      url: baseUrl,
    });

    expect(unparseable.retryAfterSeconds).toBeNull();
    expect(negative.retryAfterSeconds).toBeNull();
    expect(missing.retryAfterSeconds).toBeNull();
  });

  it("redacts sensitive response headers", () => {
    const error = new BisibilityApiError("denied", {
      body: "",
      headers: new Headers({
        Authorization: "Bearer secret",
        "Set-Cookie": "session=1",
        "X-Request-Id": "req_1",
      }),
      method: "GET",
      problem: undefined,
      status: 403,
      url: baseUrl,
    });

    expect(error.headers.get("Authorization")).toBeNull();
    expect(error.headers.get("Set-Cookie")).toBeNull();
    expect(error.headers.get("X-Request-Id")).toBe("req_1");
  });
});

describe("BisibilityClient timeout handling", () => {
  it("applies a default abort signal and lets timeout: null disable it", async () => {
    const calls: RequestInit[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(init ?? {});
      return json(emptyPage);
    });

    await client(fetchMock).listProjects();
    await client(fetchMock, { timeout: null }).listProjects();

    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(calls[1]?.signal).toBeUndefined();
    expect(new Headers(calls[0]?.headers).get("X-Bisibility-Client")).toBe(
      `bisibility-sdk-ts/${SDK_VERSION}`,
    );
  });

  it("rejects invalid retry and timeout configuration", () => {
    expect(() => client(vi.fn(), { maxRetries: -1 })).toThrow(BisibilityConfigurationError);
    expect(() => client(vi.fn(), { maxRetries: 1.5 })).toThrow(BisibilityConfigurationError);
    expect(() => client(vi.fn(), { timeout: 0 })).toThrow(BisibilityConfigurationError);
  });
});

describe("BisibilityClient retry and backoff", () => {
  it("retries network failures with exponential backoff", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline again"))
      .mockResolvedValueOnce(json(emptyPage));
    const result = client(fetchMock).listProjects({ timeout: null });

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toEqual(emptyPage);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("honors Retry-After for retryable API responses", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ title: "Busy", status: 503 }, 503, { "Retry-After": "2" }))
      .mockResolvedValueOnce(json(emptyPage));
    const result = client(fetchMock, { maxRetries: 1 }).listProjects({ timeout: null });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(emptyPage);
  });

  it("backs off without Retry-After on a retryable status", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ title: "Busy" }, 429))
      .mockResolvedValueOnce(json(emptyPage));
    const result = client(fetchMock, { maxRetries: 1 }).listProjects({ timeout: null });

    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toEqual(emptyPage);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries non-idempotent requests only with an idempotency key", async () => {
    vi.useFakeTimers();
    const busy = () => json({ title: "Busy", status: 503 }, 503);
    const withoutKey = vi.fn().mockResolvedValue(busy());
    await expect(
      client(withoutKey).createApiKey({ name: "CI" }, { timeout: null }),
    ).rejects.toBeInstanceOf(BisibilityApiError);
    expect(withoutKey).toHaveBeenCalledTimes(1);

    const withKey = vi
      .fn()
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(json({ id: "key_f00000000000000000000000" }));
    const result = client(withKey, { maxRetries: 1 }).createApiKey(
      { name: "CI" },
      { idempotencyKey: "idem_1", timeout: null },
    );
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toEqual({ id: "key_f00000000000000000000000" });
  });

  it("lets a caller abort interrupt a retry sleep", async () => {
    const controller = new AbortController();
    const cause = new Error("stop");
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    const result = client(fetchMock).listProjects({ signal: controller.signal });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    controller.abort(cause);

    await expect(result).rejects.toMatchObject({ cause });
    await expect(result).rejects.toBeInstanceOf(BisibilityNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when maxRetries is zero", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      client(fetchMock, { maxRetries: 0 }).listProjects({ timeout: null }),
    ).rejects.toBeInstanceOf(BisibilityNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("BisibilityClient resource iterators", () => {
  it("exercises every resource iterator", async () => {
    const fetchMock = vi.fn(async () => json({ data: [], meta: { next_cursor: null } }));
    const sdk = client(fetchMock, { maxRetries: 0, timeout: null });
    const iterators = [
      sdk.iterateKeywords("prj_a00000000000000000000000", { search: "same" }),
      sdk.iterateRankChecks("kw_b00000000000000000000000", { status: "completed" }),
      sdk.iterateSignals("prj_a00000000000000000000000", { source: "api" }),
      sdk.iterateApiKeys(),
      sdk.iterateProjectApiKeys("prj_a00000000000000000000000"),
      sdk.iterateWebhooks("prj_a00000000000000000000000"),
      sdk.iterateAlertRules("prj_a00000000000000000000000"),
      sdk.iterateTriggeredAlerts("prj_a00000000000000000000000"),
      sdk.iterateTeamMembers("prj_a00000000000000000000000"),
      sdk.iterateTeamInvites("prj_a00000000000000000000000"),
      sdk.iterateProviders("prj_a00000000000000000000000"),
      sdk.iterateSavedKeywords("prj_a00000000000000000000000"),
      sdk.iterateSavedViews("prj_a00000000000000000000000"),
      sdk.iterateCompetitors("prj_a00000000000000000000000"),
      sdk.iterateMigrationTokens("prj_a00000000000000000000000"),
    ];

    for (const iterator of iterators) {
      const items = [];
      for await (const item of iterator) {
        items.push(item);
      }
      expect(items).toHaveLength(0);
    }
    expect(fetchMock).toHaveBeenCalledTimes(iterators.length);
  });
});

describe("BisibilityClient signal edge cases", () => {
  it("does not retry a network failure once the caller signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("already gone"));
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));

    const result = client(fetchMock).listProjects({ signal: controller.signal });
    await expect(result).rejects.toBeInstanceOf(BisibilityNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a retry sleep entered with an already-aborted signal", async () => {
    const controller = new AbortController();
    const cause = new Error("stop mid-flight");
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        // Abort on a retryable API response so the retry path reaches the
        // sleep with an already-aborted signal.
        controller.abort(cause);
        return json({ title: "Busy" }, 503);
      }
      return json(emptyPage);
    });

    const result = client(fetchMock, { maxRetries: 2 }).listProjects({
      signal: controller.signal,
      timeout: null,
    });
    await expect(result).rejects.toBeInstanceOf(BisibilityNetworkError);
    await expect(result).rejects.toMatchObject({ cause });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("BisibilityClient empty response handling", () => {
  it("reports the real status when a body-returning method receives an empty body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(empty(200));

    await expect(
      client(fetchMock, { maxRetries: 0 }).getProject("prj_a00000000000000000000000", {
        timeout: null,
      }),
    ).rejects.toMatchObject({ status: 200 });
    await expect(
      client(fetchMock, { maxRetries: 0 }).getProject("prj_a00000000000000000000000", {
        timeout: null,
      }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });

  it("rejects invalid JSON with the response status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{not-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(
      client(fetchMock, { maxRetries: 0 }).getProject("prj_a00000000000000000000000", {
        timeout: null,
      }),
    ).rejects.toMatchObject({ status: 200 });
  });
});
