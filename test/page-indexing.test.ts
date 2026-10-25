import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  BisibilityClient,
  BisibilityConfigurationError,
  BisibilityError,
  BisibilityNetworkError,
  BisibilityResponseError,
  type ListPageIndexingUrlsOptions,
  type PageIndexingReport,
  type PageIndexingSettings,
  type PageIndexingSettingsPatch,
  type PageIndexingUrls,
} from "../src/index.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/page-indexing.json", import.meta.url), "utf8"),
) as { report: PageIndexingReport; settings: PageIndexingSettings; urls: PageIndexingUrls };
const project = "prj_abcdefghijklmnopqrstuvwx";

function setup(body: unknown, failures = 0, pages?: unknown[]) {
  const requests: { url: URL; init: RequestInit }[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_page_indexing",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: failures,
    fetch: async (url, init = {}) => {
      if (String(url).endsWith("/capabilities"))
        return new Response(JSON.stringify({ data: [], apiVersions: ["v1"] }));
      requests.push({ url: new URL(String(url)), init });
      if (requests.length <= failures) throw new Error("Temporary network failure");
      return new Response(JSON.stringify(pages ? pages[requests.length - 1] : body));
    },
  });
  return { client, requests };
}

describe("stored Page indexing operations", () => {
  it("reads a partial report with group reasons and nullable freshness", async () => {
    const { client, requests } = setup(fixture.report);
    const report = await client.getPageIndexingReport(project);
    expect(report).toEqual(fixture.report);
    expect(report.complete).toBe(false);
    expect(report.groups[0]?.reasons[0]?.oldest_result_at).toBe("2026-10-24T12:00:00.000Z");
    expect(report.groups.find((group) => group.group === "not_checked")).toMatchObject({
      complete: false,
      oldest_result_at: null,
      reasons: [{ coverage_state: null, total: 5, oldest_result_at: null }],
    });
    expect(requests[0]?.init.method).toBe("GET");
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/report`);
    expect(requests[0]?.url.search).toBe("");
  });

  it.each([undefined, 42])("rejects a missing or invalid reason timestamp: %s", async (value) => {
    const report = structuredClone(fixture.report);
    const reason = report.groups[0]?.reasons[0];
    if (!reason) throw new Error("Missing reason fixture");
    Object.assign(reason, { oldest_result_at: value });
    await expect(setup(report).client.getPageIndexingReport(project)).rejects.toBeInstanceOf(
      BisibilityResponseError,
    );
  });

  it.each([
    new Date("2026-10-24T14:00:00+02:00"),
    "2026-10-24T14:00:00+02:00",
    "server-validates-this",
  ])(
    "sends changedSince as changed_since using the shared date convention: %s",
    async (changedSince) => {
      const { client, requests } = setup(fixture.urls);
      await client.listPageIndexingUrls(project, { changedSince });
      expect(requests[0]?.url.searchParams.get("changed_since")).toBe(
        changedSince instanceof Date ? changedSince.toISOString() : changedSince,
      );
    },
  );

  it("rejects invalid changedSince dates before any fetch for lists and iteration", async () => {
    const fetch = vi.fn();
    const client = new BisibilityClient({ apiKey: "bsb_key_test_page_indexing", fetch });
    const options = { changedSince: new Date(Number.NaN) };
    expect(() => client.listPageIndexingUrls(project, options)).toThrow(
      BisibilityConfigurationError,
    );
    await expect(client.iteratePageIndexingUrls(project, options).next()).rejects.toBeInstanceOf(
      BisibilityConfigurationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads settings without a data envelope or inspection request", async () => {
    const { client, requests } = setup(fixture.settings);
    expect(await client.getPageIndexingSettings(project)).toEqual(fixture.settings);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.init.method).toBe("GET");
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/settings`);
    expect(requests[0]?.init.body).toBeUndefined();
  });

  it.each(["true", "false"] as const)("encodes all URL filters and history=%s", async (history) => {
    const { client, requests } = setup(fixture.urls);
    const options: ListPageIndexingUrlsOptions = {
      group: "not_indexed",
      coverageState: "Submitted & indexed/?",
      sitemap: "https://example.com/sitemap.xml?part=1&kind=web",
      source: "manual",
      search: "/blog?q=a b",
      cursor: "opaque+/=&?",
      limit: 100,
      history,
    };
    const result = await client.listPageIndexingUrls(project, options);
    expect(result).toEqual(fixture.urls);
    expect(result.data[0]?.history?.changes[0]?.previous.google_canonical).toBeNull();
    expect(requests[0]?.init.method).toBe("GET");
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/urls`);
    expect(Object.fromEntries(requests[0]?.url.searchParams ?? [])).toEqual({
      group: options.group,
      coverage_state: options.coverageState,
      sitemap: options.sitemap,
      source: options.source,
      search: options.search,
      cursor: options.cursor,
      limit: "100",
      history,
    });
    expect(requests[0]?.url.search).toContain("coverage_state=Submitted+%26+indexed%2F%3F");
    expect(requests[0]?.url.search).toContain("cursor=opaque%2B%2F%3D%26%3F");
  });

  it("omits undefined filters with default options and permits absent history", async () => {
    const body = structuredClone(fixture.urls);
    body.data = body.data.map(({ history: _history, ...row }) => row);
    const { client, requests } = setup(body);
    expect(await client.listPageIndexingUrls(project)).toEqual(body);
    expect(requests[0]?.url.search).toBe("");
    await client.listPageIndexingUrls(project, { limit: 1 });
    expect(requests[1]?.url.search).toBe("?limit=1");
  });

  it.each([
    { budget_mode: "off" },
    { inspection_daily_limit: 0 },
    { budget_mode: "fixed", inspection_daily_limit: 2000 },
    { budget_mode: "available_quota" },
  ] satisfies PageIndexingSettingsPatch[])("patches exact settings fields: %j", async (patch) => {
    const { client, requests } = setup(fixture.settings);
    expect(
      await client.updatePageIndexingSettings(project, patch, { idempotencyKey: "settings-1" }),
    ).toEqual(fixture.settings);
    expect(requests[0]?.init.method).toBe("PATCH");
    expect(requests[0]?.url.pathname).toBe(`/api/v1/projects/${project}/search-index/settings`);
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual(patch);
    expect(new Headers(requests[0]?.init.headers).get("Idempotency-Key")).toBe("settings-1");
  });

  it("requires a setting and exact input enum literals in public types", () => {
    expectTypeOf<Record<never, never>>().not.toExtend<PageIndexingSettingsPatch>();
    expectTypeOf<{ budget_mode: "future_mode" }>().not.toExtend<PageIndexingSettingsPatch>();
    expectTypeOf<{ inspection_daily_limit: number }>().toExtend<PageIndexingSettingsPatch>();
    expectTypeOf<{ history: boolean }>().not.toExtend<ListPageIndexingUrlsOptions>();
    expectTypeOf<{
      history: "true";
      group: "indexed";
      source: "manual";
    }>().toExtend<ListPageIndexingUrlsOptions>();
    expectTypeOf<{ group: "future_group" }>().not.toExtend<ListPageIndexingUrlsOptions>();
  });

  it.each([undefined, "stable-settings-key"])(
    "preserves PATCH retry rules with key %s",
    async (key) => {
      const { client, requests } = setup(fixture.settings, 1);
      const call = client.updatePageIndexingSettings(
        project,
        { budget_mode: "fixed" },
        key ? { idempotencyKey: key } : {},
      );
      if (key) {
        await expect(call).resolves.toEqual(fixture.settings);
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

  it("supports header keys with option precedence for settings", async () => {
    for (const key of [undefined, "option-key"]) {
      const { client, requests } = setup(fixture.settings);
      await client.updatePageIndexingSettings(
        project,
        { budget_mode: "off" },
        {
          headers: { "Idempotency-Key": "header-key" },
          ...(key ? { idempotencyKey: key } : {}),
        },
      );
      expect(new Headers(requests[0]?.init.headers).get("Idempotency-Key")).toBe(
        key ?? "header-key",
      );
    }
  });

  it("accepts future response enums and null scalars", async () => {
    const report = {
      ...fixture.report,
      budget_mode: "future_mode",
      oldest_result_at: null,
      newest_result_at: null,
      discovered_at: null,
      estimated_days_remaining: null,
    };
    report.groups = report.groups.map((group) => ({ ...group, group: "future_group" }));
    expect(await setup(report).client.getPageIndexingReport(project)).toEqual(report);
    const settings = {
      ...fixture.settings,
      budget_mode: "future_mode",
      available_modes: ["future_mode"],
    };
    expect(await setup(settings).client.getPageIndexingSettings(project)).toEqual(settings);
    const urls = structuredClone(fixture.urls);
    const row = urls.data[0];
    if (!row) throw new Error("Missing URL fixture");
    row.group = "future_group";
    row.source = "future_source";
    row.verdict = "future_verdict";
    row.canonical_ok = null;
    row.checked_at = null;
    expect(await setup(urls).client.listPageIndexingUrls(project)).toEqual(urls);
  });

  it.each(["report", "list", "settings", "update"])(
    "validates the %s response",
    async (operation) => {
      const { client } = setup({ data: {} });
      const call =
        operation === "report"
          ? client.getPageIndexingReport(project)
          : operation === "list"
            ? client.listPageIndexingUrls(project)
            : operation === "settings"
              ? client.getPageIndexingSettings(project)
              : client.updatePageIndexingSettings(project, { budget_mode: "off" });
      await expect(call).rejects.toBeInstanceOf(BisibilityResponseError);
    },
  );

  it("validates optional history when present", async () => {
    const body = {
      ...fixture.urls,
      data: [{ ...fixture.urls.data[0], history: { complete: "false", changes: [] } }],
    };
    await expect(
      setup(body).client.listPageIndexingUrls(project, { history: "true" }),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });

  it("validates all four project paths before fetch", () => {
    const { client, requests } = setup(fixture.report);
    const invalid = "bad" as typeof project;
    expect(() => client.getPageIndexingReport(invalid)).toThrow(BisibilityConfigurationError);
    expect(() => client.listPageIndexingUrls(invalid)).toThrow(BisibilityConfigurationError);
    expect(() => client.getPageIndexingSettings(invalid)).toThrow(BisibilityConfigurationError);
    expect(() => client.updatePageIndexingSettings(invalid, { budget_mode: "off" })).toThrow(
      BisibilityConfigurationError,
    );
    expect(requests).toHaveLength(0);
  });
});

describe("Page indexing URL iterator", () => {
  it("follows next_cursor, preserving filters and request options on every page", async () => {
    const finalPage = { ...fixture.urls, meta: { next_cursor: null } };
    const { client, requests } = setup(null, 0, [fixture.urls, finalPage]);
    const rows = [];
    for await (const row of client.iteratePageIndexingUrls(
      project,
      {
        cursor: "initial+/",
        group: "indexed",
        history: "true",
        changedSince: new Date("2026-10-24T12:00:00.000Z"),
        limit: 1,
      },
      { headers: { "X-Trace": "iteration" } },
    ))
      rows.push(row);
    expect(rows).toEqual([...fixture.urls.data, ...finalPage.data]);
    expect(requests.map(({ url }) => url.searchParams.get("cursor"))).toEqual([
      "initial+/",
      fixture.urls.meta.next_cursor,
    ]);
    for (const { url, init } of requests) {
      expect(url.searchParams.get("history")).toBe("true");
      expect(url.searchParams.get("changed_since")).toBe("2026-10-24T12:00:00.000Z");
      expect(url.searchParams.get("group")).toBe("indexed");
      expect(url.searchParams.get("limit")).toBe("1");
      expect(new Headers(init.headers).get("X-Trace")).toBe("iteration");
    }
  });

  it("ends on an empty page without an initial cursor", async () => {
    const { client, requests } = setup({ data: [], meta: { next_cursor: null } });
    const iterator = client.iteratePageIndexingUrls(project);
    expect(await iterator.next()).toMatchObject({ done: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url.search).toBe("");
  });

  it("rejects repeated cursors instead of looping", async () => {
    const { client, requests } = setup(fixture.urls);
    const iterator = client.iteratePageIndexingUrls(project);
    await iterator.next();
    await iterator.next();
    await expect(iterator.next()).rejects.toBeInstanceOf(BisibilityError);
    expect(requests).toHaveLength(2);
  });
});
