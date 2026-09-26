import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { BisibilityClient } from "../src/client.js";
const project = "prj_a00000000000000000000000";
function setup(reply: unknown = { data: [] }, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(reply, { status }));
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_x",
    baseUrl: "https://api.example.com/api/v1",
    maxRetries: 0,
    fetch: (url, init) =>
      String(url).endsWith("/capabilities")
        ? Promise.resolve(Response.json({ apiVersions: ["v1"], data: [] }))
        : fetch(url, init),
  });
  return { client, fetch };
}
it("reads stored reports through GET with exact false, zero and selection parameters", async () => {
  const { client, fetch } = setup();
  await client.researchReports.list(project);
  await client.researchReports.get(project, "backlinks", {
    target: "example.com/a?b=1",
    includeSubdomains: false,
    locationCode: 0,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, init] = fetch.mock.calls[1] ?? [];
  expect(init?.method).toBe("GET");
  const parsed = new URL(String(url));
  expect(parsed.pathname).toBe(`/api/v1/projects/${project}/research/reports/backlinks`);
  expect(parsed.searchParams.get("target")).toBe("example.com/a?b=1");
  expect(parsed.searchParams.get("include_subdomains")).toBe("false");
  expect(parsed.searchParams.get("location_code")).toBe("0");
  expect(init?.body).toBeUndefined();
});
it("keeps the two funding budgets separate and preserves null versus omission", async () => {
  const { client, fetch } = setup();
  await client.providers.budgets.list(project);
  await client.providers.budgets.update(project, "dataforseo", {
    own: { app: null },
    credits: { programmatic: { amount_per_month: 123, unit: "cents" } },
  });
  const [url, init] = fetch.mock.calls[1] ?? [];
  expect(String(url)).toContain("/providers/dataforseo/budgets");
  expect(init?.method).toBe("PATCH");
  expect(JSON.parse(String(init?.body))).toEqual({
    own: { app: null },
    credits: { programmatic: { amount_per_month: 123, unit: "cents" } },
  });
});
it("propagates missing saved reports without attempting paid fallback", async () => {
  const { client, fetch } = setup({ title: "Not found", status: 404 }, 404);
  await expect(
    client.researchReports.get(project, "keyword_research", { seed: "example" }),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("reads all three saved report variants with freshness separate from data state", async () => {
  const fixtures = JSON.parse(
    readFileSync(new URL("./fixtures/stored-reports.json", import.meta.url), "utf8"),
  ) as Record<string, unknown>;
  for (const kind of ["backlinks", "domain_overview", "keyword_research"] as const) {
    const { client } = setup({ data: fixtures[kind] });
    const result = await client.researchReports.get(project, kind);
    expect(result.data.state).toBe("fresh");
    if (kind === "domain_overview") expect(result.data).toHaveProperty("data_state", "no_data");
  }
});
