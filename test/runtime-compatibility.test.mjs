import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import {
  BisibilityClient,
  BisibilityNetworkError,
  BisibilityResponseError,
  isPublicIdOfType,
} from "@bisibility/sdk";

// Exercise the built package with Node's own runner, independently of the development framework.
const projectId = "prj_abcdefghijklmnopqrstuvwx";
const keywordId = "kw_abcdefghijklmnopqrstuvwx";
const runId = "rcr_abcdefghijklmnopqrstuvwx";
const checkId = "check_abcdefghijklmnopqrstuvwx";
const reportId = "agr_abcdefghijklmnopqrstuvwx";
const context = {
  business: "Example",
  audience: "Readers",
  products: "Reports",
  goals: "Measure",
  agent_rules: "Cite sources",
  updated_at: null,
};
const check = {
  attempts: null,
  checked_at: "2026-10-07T12:00:00.000Z",
  cost_cents: 1,
  error: null,
  id: checkId,
  keyword_id: keywordId,
  position: 2,
  previous_position: null,
  provider: "example",
  ranking_url: "https://example.com",
  run_id: runId,
  status: "completed",
};
function setup(handler, options = {}) {
  return new BisibilityClient({
    apiKey: "bsb_key_test_example",
    baseUrl: "https://api.example.com/api/v1",
    fetch: (url, init) =>
      String(url).endsWith("/capabilities")
        ? Promise.resolve(Response.json({ apiVersions: ["v1"], data: [] }))
        : handler(new URL(String(url)), init),
    ...options,
  });
}

test("built ESM package imports and uses native fetch with request metadata", async () => {
  let headers;
  const server = createServer((request, response) => {
    headers = request.headers;
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify(
        request.url.endsWith("/capabilities")
          ? { apiVersions: ["v1"], data: [] }
          : { data: context },
      ),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const client = new BisibilityClient({
      apiKey: "bsb_key_test_example",
      baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    });
    assert.deepEqual(await client.projectContext.get(projectId), { data: context });
    assert.equal(headers.authorization, "Bearer bsb_key_test_example");
    assert.equal(headers["x-bisibility-source"], "sdk");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("custom transport retries a transient response and decodes the next success", async () => {
  let calls = 0;
  const client = setup(
    async (url, init) => {
      assert.equal(url.pathname, "/api/v1/projects");
      assert.equal(init.method, "GET");
      calls++;
      return calls === 1
        ? Response.json(
            { title: "Busy", status: 503 },
            { status: 503, headers: { "Retry-After": "0" } },
          )
        : Response.json({ data: [], meta: { next_cursor: null } });
    },
    { maxRetries: 1 },
  );
  assert.deepEqual(await client.projects.list(), { data: [], meta: { next_cursor: null } });
  assert.equal(calls, 2);
});

test("in-flight cancellation reaches the custom transport", async () => {
  const controller = new AbortController();
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const client = setup(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
        started();
      }),
    { maxRetries: 0 },
  );
  const pending = client.projectContext.get(projectId, { signal: controller.signal });
  await ready;
  controller.abort(new Error("Example cancellation"));
  await assert.rejects(
    pending,
    (error) => error instanceof BisibilityNetworkError && error.cause === controller.signal.reason,
  );
});

test("cursor iteration follows the next page and preserves filters", async () => {
  const urls = [];
  const client = setup(async (url) => {
    urls.push(url);
    return Response.json({
      data: [check],
      meta: { next_cursor: urls.length === 1 ? "second" : null },
    });
  });
  const rows = [];
  for await (const row of client.rankChecks.iterate(keywordId, { limit: 1 })) rows.push(row);
  assert.equal(rows.length, 2);
  assert.equal(urls[0].searchParams.get("limit"), "1");
  assert.equal(urls[1].searchParams.get("limit"), "1");
  assert.equal(urls[1].searchParams.get("cursor"), "second");
});

test("typed ID guards reject invalid requests and response resource IDs", async () => {
  assert.equal(isPublicIdOfType(reportId, "agr"), true);
  let calls = 0;
  const client = setup(async () => {
    calls++;
    return Response.json({
      data: {
        id: projectId,
        kind: "external_analysis",
        title: "Example",
        created_at: "2026-10-07T12:00:00.000Z",
        body: {},
        provenance: {},
      },
    });
  });
  await assert.rejects(client.agentReports.get(projectId, projectId), /reportId must match agr_/);
  assert.equal(calls, 0);
  await assert.rejects(client.agentReports.get(projectId, reportId), BisibilityResponseError);
  assert.equal(calls, 1);
});

test("queued rank checks poll matching history through a running row to completion", async () => {
  const requests = [];
  let polls = 0;
  const client = setup(async (url, init) => {
    requests.push(`${init.method} ${url.pathname}`);
    if (init.method === "POST")
      return Response.json(
        {
          id: runId,
          status: "queued",
          keyword_id: keywordId,
          device: "desktop",
          location: "United States",
        },
        { status: 202 },
      );
    polls++;
    return Response.json({
      data: [{ ...check, status: polls === 1 ? "running" : "completed" }],
      meta: { next_cursor: null },
    });
  });
  assert.deepEqual(
    await client.rankChecks.runAndWait(keywordId, undefined, {
      pollIntervalMs: 1,
      timeoutMs: 1000,
    }),
    check,
  );
  assert.equal(polls, 2);
  assert.deepEqual(requests, [
    `POST /api/v1/keywords/${keywordId}/checks`,
    `GET /api/v1/keywords/${keywordId}/rank-checks`,
    `GET /api/v1/keywords/${keywordId}/rank-checks`,
  ]);
});
