import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BisibilityApiError,
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityNetworkError,
  BisibilityResponseError,
  type SearchIndexInspections,
  type SearchIndexSitemapResponse,
  type SearchIndexSitemaps,
} from "../src/index.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/search-index.json", import.meta.url), "utf8"),
) as {
  sitemaps: SearchIndexSitemaps;
  sitemap: SearchIndexSitemapResponse;
  inspections: SearchIndexInspections;
} & Record<string, unknown>;
const project = "prj_abcdefghijklmnopqrstuvwx";
const sitemap = "https://example.com/blog/sitemap.xml?part=1&name=a%20b";
const input = { urls: ["https://example.com/blog/a", "https://example.com/blog/b"] };

function setup(body: unknown, status = 200, failures = 0) {
  const requests: { url: URL; init: RequestInit }[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_search_index",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: failures,
    fetch: async (url, init = {}) => {
      if (String(url).endsWith("/capabilities"))
        return new Response(JSON.stringify({ data: [], apiVersions: ["v1"] }));
      requests.push({ url: new URL(String(url)), init });
      if (requests.length <= failures) throw new Error("Temporary network failure");
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Retry-After": "7" },
      });
    },
  });
  return { client, requests };
}

describe("Page indexing sitemap and inspection operations", () => {
  it("lists sitemaps without an extra data envelope", async () => {
    const { client, requests } = setup(fixture.sitemaps);
    expect(await client.listSearchIndexSitemaps(project)).toEqual(fixture.sitemaps);
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/sitemaps`);
    expect(requests[0]?.url.search).toBe("");
    expect(requests[0]?.init.method).toBe("GET");
  });

  it("encodes the full sitemap URL once as one segment, including existing URL escapes", async () => {
    const { client, requests } = setup(fixture.sitemap);
    expect(await client.getSearchIndexSitemap(project, sitemap)).toEqual(fixture.sitemap);
    const path = requests[0]?.url.pathname;
    expect(path).toBe(
      `/api/v1/projects/${project}/search-index/sitemaps/https%3A%2F%2Fexample.com%2Fblog%2Fsitemap.xml%3Fpart%3D1%26name%3Da%2520b`,
    );
    expect(path).not.toContain("https%253A");
    expect(requests[0]?.url.search).toBe("");
    expect(requests[0]?.init.method).toBe("GET");
  });

  it("contains slash traversal inside the sitemap segment", async () => {
    const { client, requests } = setup(fixture.sitemap);
    await client.getSearchIndexSitemap(project, "https://example.com/../../settings");
    expect(requests[0]?.url.pathname.split("/")).toHaveLength(8);
    expect(requests[0]?.url.pathname).toContain("%2F..%2F..%2Fsettings");
  });

  it.each([
    "",
    ".",
    "..",
    `https://example.com/${"a".repeat(2029)}`,
    "sitemap.xml",
    "ftp://example.com/sitemap.xml",
    "https://",
    undefined,
    null,
    42,
  ])("rejects invalid sitemap paths before fetch (%#)", (path) => {
    const { client, requests } = setup(fixture.sitemap);
    expect(() => client.getSearchIndexSitemap(project, path as string)).toThrow(
      BisibilityConfigurationError,
    );
    expect(requests).toHaveLength(0);
  });

  it("accepts a 2048-character sitemap URL as one encoded segment", async () => {
    const { client, requests } = setup(fixture.sitemap);
    const path = `https://example.com/${"a".repeat(2028)}`;
    expect(path).toHaveLength(2048);
    expect(await client.getSearchIndexSitemap(project, path)).toEqual(fixture.sitemap);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url.pathname).toBe(
      `/api/v1/projects/${project}/search-index/sitemaps/${encodeURIComponent(path)}`,
    );
    expect(requests[0]?.url.pathname.split("/")).toHaveLength(8);
  });

  it("posts URLs and retains successful and rate-limited rows under HTTP 200", async () => {
    const { client, requests } = setup(fixture.inspections);
    const result = await client.inspectSearchIndexUrls(project, input, {
      idempotencyKey: "batch-1",
    });
    expect(result).toEqual(fixture.inspections);
    expect(result.results[0]?.inspection?.verdict).toBe("PASS");
    expect(result.results[1]?.error).toMatchObject({
      code: "provider_rate_limited",
      reset_at: expect.any(String),
      scope: expect.any(String),
    });
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/inspections`);
    expect(requests[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual(input);
    expect(new Headers(requests[0]?.init.headers).get("Idempotency-Key")).toBe("batch-1");
  });

  it("preserves nullable scalar fields and additive response enums", async () => {
    const body = structuredClone(fixture.inspections);
    const inspection = body.results[0]?.inspection;
    if (!inspection) throw new Error("Missing inspection fixture");
    for (const key of [
      "verdict",
      "coverage_state",
      "robots_txt_state",
      "indexing_state",
      "last_crawl_time",
      "last_crawl_at",
      "page_fetch_state",
      "google_canonical",
      "user_canonical",
      "crawled_as",
      "inspection_result_link",
      "rich_results_result",
    ] as const)
      inspection[key] = null;
    const error = body.results[1]?.error;
    if (!error) throw new Error("Missing error fixture");
    error.code = "future_error";
    error.scope = "future_scope";
    const { client } = setup(body);
    expect(await client.inspectSearchIndexUrls(project, input)).toEqual(body);
    const sitemapBody = structuredClone(fixture.sitemap);
    sitemapBody.sitemap.type = null;
    sitemapBody.sitemap.last_downloaded = null;
    sitemapBody.sitemap.last_submitted = null;
    expect(await setup(sitemapBody).client.getSearchIndexSitemap(project, sitemap)).toEqual(
      sitemapBody,
    );
  });

  it.each(["list", "get", "inspect"])("rejects malformed %s success bodies", async (operation) => {
    const { client } = setup({ data: {} });
    const call =
      operation === "list"
        ? client.listSearchIndexSitemaps(project)
        : operation === "get"
          ? client.getSearchIndexSitemap(project, sitemap)
          : client.inspectSearchIndexUrls(project, input);
    await expect(call).rejects.toBeInstanceOf(BisibilityResponseError);
  });

  it.each([404, 422, 429])("maps HTTP %s problems through BisibilityApiError", async (status) => {
    const { client } = setup(fixture[`problem${status}`], status);
    const error = await client.listSearchIndexSitemaps(project).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(BisibilityApiError);
    expect(error).toMatchObject({ status, problem: fixture[`problem${status}`] });
    if (error instanceof BisibilityApiError) {
      expect(error.isNotFound).toBe(status === 404);
      expect(error.isRateLimit).toBe(status === 429);
      expect(error.retryAfterSeconds).toBe(7);
    }
  });

  it.each([undefined, "stable-key"])(
    "only retries inspections with a stable key: %s",
    async (key) => {
      const { client, requests } = setup(fixture.inspections, 200, 1);
      const call = client.inspectSearchIndexUrls(
        project,
        input,
        key ? { idempotencyKey: key } : {},
      );
      if (key) {
        await expect(call).resolves.toEqual(fixture.inspections);
        expect(requests).toHaveLength(2);
        expect(
          requests.map(({ init }) => new Headers(init.headers).get("Idempotency-Key")),
        ).toEqual([key, key]);
      } else {
        await expect(call).rejects.toBeInstanceOf(BisibilityNetworkError);
        expect(requests).toHaveLength(1);
        expect(new Headers(requests[0]?.init.headers).has("Idempotency-Key")).toBe(false);
      }
    },
  );

  it("honors header keys and gives the public idempotencyKey option precedence", async () => {
    for (const key of [undefined, "option-key"]) {
      const { client, requests } = setup(fixture.inspections);
      await client.inspectSearchIndexUrls(project, input, {
        headers: { "Idempotency-Key": "header-key" },
        ...(key ? { idempotencyKey: key } : {}),
      });
      expect(new Headers(requests[0]?.init.headers).get("Idempotency-Key")).toBe(
        key ?? "header-key",
      );
    }
  });

  it("validates project IDs for all three operations before fetch", () => {
    const { client, requests } = setup(fixture.sitemaps);
    const invalid = "bad" as typeof project;
    expect(() => client.listSearchIndexSitemaps(invalid)).toThrow(BisibilityConfigurationError);
    expect(() => client.getSearchIndexSitemap(invalid, sitemap)).toThrow(
      BisibilityConfigurationError,
    );
    expect(() => client.inspectSearchIndexUrls(invalid, input)).toThrow(
      BisibilityConfigurationError,
    );
    expect(requests).toHaveLength(0);
  });
});
