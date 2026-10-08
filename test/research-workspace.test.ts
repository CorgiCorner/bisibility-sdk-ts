import { describe, expect, it, vi } from "vitest";
import {
  type AiAnalysisOutcome,
  BisibilityClient,
  BisibilityResponseError,
  type ProjectContext,
  type SiteAudit,
} from "../src/index.js";

import { validatePublicIdResponse } from "../src/public-id-contract.js";

const projectId = "prj_abcdefghijklmnopqrstuvwx";
const reportId = "agr_abcdefghijklmnopqrstuvwx";
const createdAt = "2026-10-07T12:00:00.000Z";
const contextInput = {
  business: "Example",
  audience: "Readers",
  products: "Reports",
  goals: "Measure",
  agent_rules: "Cite sources",
};
const context: ProjectContext = { ...contextInput, updated_at: null };
const report = {
  id: reportId,
  kind: "external_analysis",
  title: "Example report",
  created_at: createdAt,
  body: { nested: { notes: ["Example"] } },
  provenance: { source: "https://example.org" },
};
const summary = { id: reportId, kind: "site_audit", title: "Example audit", created_at: createdAt };
const audit: SiteAudit = {
  id: reportId,
  created_at: createdAt,
  cached: false,
  result: {
    version: 1,
    target: "https://example.com",
    started_at: createdAt,
    completed_at: createdAt,
    state: "complete",
    stop_reason: "finished",
    limits: { max_pages: 10, max_requests: 20, max_duration_ms: 30000, max_page_bytes: 100000 },
    requests: 1,
    pages: [
      {
        url: "https://example.com",
        final_url: "https://example.com",
        status: 200,
        response_time_ms: 12,
        title: "Example",
        description: null,
        canonical: null,
        headings: [{ level: 1, text: "Example" }],
        h1_count: 1,
        indexable: true,
        robots: null,
        internal_link_count: 0,
        external_link_count: 0,
        internal_links: [],
        image_count: 0,
        missing_alt_count: 0,
        issues: [{ code: "missing_description", severity: "warning", message: "No description" }],
      },
    ],
    summary: { pages: 1, errors: 0, warnings: 1, indexable: 1 },
    limitations: ["Bounded crawl"],
  },
};
const estimate: AiAnalysisOutcome = {
  ok: true,
  estimate: true,
  estimated_cost_cents: 2,
  evidence: "observed_dataset",
};
const analysis: AiAnalysisOutcome = {
  ok: true,
  estimate: false,
  cached: false,
  report_id: reportId,
  cost_cents: 2,
  result: {
    evidence: "synthetic_prompt_test",
    rows: [
      {
        prompt: "Example?",
        model: "gpt-4.1-mini",
        answer: "Example",
        observed_at: null,
        brand_mentioned: true,
        domain_cited: true,
        citations: [{ title: "Example", url: "https://example.com", target_domain: true }],
        content_truncated: false,
      },
    ],
    total_available: null,
    truncated: false,
    fetched_at: createdAt,
    cost_cents: 2,
    cost_status: "confirmed",
    failure: null,
  },
};
const aiInput = { brand: "Example", domain: "example.com", max_cost_cents: 5 };

function clientWith(response: unknown, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  return {
    client: new BisibilityClient({
      apiKey: "bsb_key_test_example",
      fetch: (url, init) =>
        String(url).endsWith("/capabilities")
          ? Promise.resolve(Response.json({ apiVersions: ["v1"], data: [] }))
          : fetch(url, init),
      maxRetries: 0,
    }),
    fetch,
  };
}

const cases = [
  {
    name: "getProjectContext",
    method: "GET",
    route: "context",
    response: { data: context },
    call: (c: BisibilityClient) => c.getProjectContext(projectId),
    resource: (c: BisibilityClient) => c.projectContext.get(projectId),
  },
  {
    name: "updateProjectContext",
    method: "PATCH",
    route: "context",
    body: contextInput,
    response: { data: context },
    call: (c: BisibilityClient) => c.updateProjectContext(projectId, contextInput),
    resource: (c: BisibilityClient) => c.projectContext.update(projectId, contextInput),
  },
  {
    name: "listAgentReports",
    method: "GET",
    route: "agent-reports?kind=external_analysis&limit=2&cursor=opaque",
    response: { data: [report], meta: { next_cursor: "next" } },
    call: (c: BisibilityClient) =>
      c.listAgentReports(projectId, { kind: "external_analysis", limit: 2, cursor: "opaque" }),
    resource: (c: BisibilityClient) =>
      c.agentReports.list(projectId, { kind: "external_analysis", limit: 2, cursor: "opaque" }),
  },
  {
    name: "createAgentReport",
    method: "POST",
    route: "agent-reports",
    body: {
      kind: report.kind,
      title: report.title,
      body: report.body,
      provenance: report.provenance,
    },
    response: { data: report },
    status: 201,
    call: (c: BisibilityClient) =>
      c.createAgentReport(projectId, {
        kind: report.kind,
        title: report.title,
        body: report.body,
        provenance: report.provenance,
      }),
    resource: (c: BisibilityClient) =>
      c.agentReports.create(projectId, {
        kind: report.kind,
        title: report.title,
        body: report.body,
        provenance: report.provenance,
      }),
  },
  {
    name: "getAgentReport",
    method: "GET",
    route: `agent-reports/${reportId}`,
    response: { data: report },
    call: (c: BisibilityClient) => c.getAgentReport(projectId, reportId),
    resource: (c: BisibilityClient) => c.agentReports.get(projectId, reportId),
  },
  {
    name: "analyzeAiVisibility",
    method: "POST",
    route: "ai-visibility",
    body: {
      ...aiInput,
      estimate_only: true,
      platform: "google",
      language_code: "en",
      location_code: 2840,
      target_type: "domain",
      limit: 3,
      fresh: false,
    },
    response: { data: estimate },
    call: (c: BisibilityClient) =>
      c.analyzeAiVisibility(projectId, {
        ...aiInput,
        estimate_only: true,
        platform: "google",
        language_code: "en",
        location_code: 2840,
        target_type: "domain",
        limit: 3,
        fresh: false,
      }),
    resource: (c: BisibilityClient) =>
      c.aiVisibility.analyze(projectId, {
        ...aiInput,
        estimate_only: true,
        platform: "google",
        language_code: "en",
        location_code: 2840,
        target_type: "domain",
        limit: 3,
        fresh: false,
      }),
  },
  {
    name: "compareAiPrompts",
    method: "POST",
    route: "prompt-explorer",
    body: { ...aiInput, prompt: "Example?", models: ["gpt-4.1-mini"], fresh: true },
    response: { data: analysis },
    call: (c: BisibilityClient) =>
      c.compareAiPrompts(projectId, {
        ...aiInput,
        prompt: "Example?",
        models: ["gpt-4.1-mini"],
        fresh: true,
      }),
    resource: (c: BisibilityClient) =>
      c.promptExplorer.compare(projectId, {
        ...aiInput,
        prompt: "Example?",
        models: ["gpt-4.1-mini"],
        fresh: true,
      }),
  },
  {
    name: "listSiteAudits",
    method: "GET",
    route: "site-audits",
    response: { data: [summary] },
    call: (c: BisibilityClient) => c.listSiteAudits(projectId),
    resource: (c: BisibilityClient) => c.siteAudits.list(projectId),
  },
  {
    name: "runSiteAudit",
    method: "POST",
    route: "site-audits",
    body: { max_pages: 3 },
    response: { data: audit },
    call: (c: BisibilityClient) => c.runSiteAudit(projectId, { max_pages: 3 }),
    resource: (c: BisibilityClient) => c.siteAudits.run(projectId, { max_pages: 3 }),
  },
  {
    name: "getSiteAudit",
    method: "GET",
    route: `site-audits/${reportId}`,
    response: { data: audit },
    call: (c: BisibilityClient) => c.getSiteAudit(projectId, reportId),
    resource: (c: BisibilityClient) => c.siteAudits.get(projectId, reportId),
  },
];

describe("research workspace operations", () => {
  it.each(cases)(
    "$name sends the current route and decodes its response through both interfaces",
    async ({ method, route, body, response, status, call, resource }) => {
      for (const invoke of [call, resource]) {
        const { client, fetch } = clientWith(response, status);
        await expect(invoke(client)).resolves.toEqual(response);
        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, init] = fetch.mock.calls[0] ?? [];
        expect(String(url)).toBe(`https://bisibility.com/api/v1/projects/${projectId}/${route}`);
        expect(init?.method).toBe(method);
        expect(init?.body ? JSON.parse(init.body as string) : undefined).toEqual(
          body ? JSON.parse(JSON.stringify(body)) : undefined,
        );
      }
    },
  );

  it.each(cases)("$name rejects a malformed successful envelope", async ({ call }) => {
    const { client } = clientWith({ data: {} });
    await expect(call(client)).rejects.toBeInstanceOf(BisibilityResponseError);
  });

  it("preserves cancellation and request headers on new methods", async () => {
    const { client, fetch } = clientWith({ data: context });
    const signal = new AbortController().signal;
    await client.projectContext.get(projectId, { signal, headers: { "X-Example": "present" } });
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get("X-Example")).toBe("present");
  });

  it("omits empty filters on unfiltered list requests", async () => {
    for (const invoke of [
      (c: BisibilityClient) => c.listApiKeys(),
      (c: BisibilityClient) => c.listKeywords(projectId),
      (c: BisibilityClient) => c.listRankChecks("kw_abcdefghijklmnopqrstuvwx"),
      (c: BisibilityClient) => c.listAlertRules(projectId),
      (c: BisibilityClient) => c.listTeamMembers(projectId),
      (c: BisibilityClient) => c.listTeamInvites(projectId),
      (c: BisibilityClient) => c.apiKeys.list(),
      async (c: BisibilityClient) => {
        for await (const _row of c.apiKeys.iterate()) {
        }
      },
    ]) {
      const { client, fetch } = clientWith({ data: [], meta: { next_cursor: null } });
      await invoke(client);
      expect(new URL(String(fetch.mock.calls[0]?.[0])).search).toBe("");
      expect(fetch).toHaveBeenCalledOnce();
    }
  });

  it("rejects a configured project ID for another resource", () => {
    expect(
      () => new BisibilityClient({ projectId: reportId as unknown as typeof projectId }),
    ).toThrow("projectId must match prj_");
  });

  it("lists reports without optional filters and keeps empty result pages", async () => {
    const response = { data: [], meta: { next_cursor: null } };
    const { client, fetch } = clientWith(response);
    await expect(client.agentReports.list(projectId)).resolves.toEqual(response);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `https://bisibility.com/api/v1/projects/${projectId}/agent-reports`,
    );
  });

  it("rejects missing report IDs directly at the ID boundary", () => {
    for (const route of ["agent-reports", "site-audits"]) {
      for (const response of [null, {}, { data: null }, { data: [null] }, { data: [{}] }]) {
        expect(() =>
          validatePublicIdResponse(`/projects/${projectId}/${route}`, response, "GET"),
        ).toThrow(/agr_/);
      }
    }
    for (const route of ["ai-visibility", "prompt-explorer"]) {
      for (const response of [null, {}, { data: null }, { data: { estimate: true } }]) {
        expect(() =>
          validatePublicIdResponse(`/projects/${projectId}/${route}`, response, "POST"),
        ).not.toThrow();
      }
    }
  });

  it("sends an empty object when starting an audit with default bounds", async () => {
    const { client, fetch } = clientWith({ data: audit });
    await client.siteAudits.run(projectId);
    expect(fetch.mock.calls[0]?.[1]?.body).toBe("{}");
  });

  it("rejects wrong report prefixes before fetching", async () => {
    for (const method of ["getAgentReport", "getSiteAudit"] as const) {
      const { client, fetch } = clientWith({ data: report });
      await expect(
        client[method](projectId, projectId as unknown as typeof reportId),
      ).rejects.toThrow("reportId must match agr_");
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it("rejects wrong report prefixes in summaries, reports, audits, and paid AI results", async () => {
    for (const [response, call] of [
      [
        { data: [{ ...report, id: projectId }], meta: { next_cursor: null } },
        (c: BisibilityClient) => c.listAgentReports(projectId),
      ],
      [
        { data: { ...report, id: projectId } },
        (c: BisibilityClient) => c.getAgentReport(projectId, reportId),
      ],
      [
        { data: [{ ...summary, id: projectId }] },
        (c: BisibilityClient) => c.listSiteAudits(projectId),
      ],
      [
        { data: { ...audit, id: projectId } },
        (c: BisibilityClient) => c.getSiteAudit(projectId, reportId),
      ],
      [
        { data: { ...analysis, report_id: projectId } },
        (c: BisibilityClient) => c.compareAiPrompts(projectId, { ...aiInput, prompt: "Example?" }),
      ],
    ] as const) {
      const { client } = clientWith(response);
      await expect(call(client)).rejects.toBeInstanceOf(BisibilityResponseError);
    }
  });

  it("rejects malformed nested audit data and either AI outcome variant", async () => {
    for (const data of [
      { ...audit, result: { ...audit.result, state: "unfinished" } },
      {
        ...audit,
        result: { ...audit.result, pages: [{ ...audit.result.pages[0], indexable: "yes" }] },
      },
    ]) {
      const { client } = clientWith({ data });
      await expect(client.siteAudits.get(projectId, reportId)).rejects.toBeInstanceOf(
        BisibilityResponseError,
      );
    }
    for (const data of [
      { ...estimate, estimated_cost_cents: "2" },
      { ...analysis, result: { ...analysis.result, cost_status: "guessed" } },
    ]) {
      const { client } = clientWith({ data });
      await expect(client.aiVisibility.analyze(projectId, aiInput)).rejects.toBeInstanceOf(
        BisibilityResponseError,
      );
    }
  });
});
