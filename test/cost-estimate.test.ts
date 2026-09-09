import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { BisibilityClient } from "../src/index.js";
import type {
  CostEstimate,
  FlatCostEstimate,
  GetCostEstimateOptions,
  PlanCostEstimate,
} from "../src/index.js";

function harness(data: unknown = {}) {
  const requests: Array<{ url: URL; headers: Headers }> = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/capabilities")) {
      return Response.json({ apiVersions: ["v1"], data: [] });
    }
    requests.push({ headers: new Headers(init?.headers), url });
    return Response.json({ data });
  });
  return {
    client: new BisibilityClient({ baseUrl: "https://api.example.com/api/v1", fetch }),
    request: () => {
      const first = requests[0];
      if (!first) throw new Error("Expected a cost estimate request");
      return first;
    },
  };
}

describe("depth-aware cost estimates", () => {
  it.each([10, 20, 50, 100] as const)(
    "forwards depth %s through the pricing resource",
    async (depth) => {
      const { client, request } = harness();
      await client.pricing.estimate({
        cron_expression: "0 7 * * 1",
        depth,
        devices: 2,
        frequency: "custom_cron",
        keywords: 12,
        locations: 3,
      });
      expect(Object.fromEntries(request().url.searchParams)).toEqual({
        cron_expression: "0 7 * * 1",
        depth: String(depth),
        devices: "2",
        frequency: "custom_cron",
        keywords: "12",
        locations: "3",
      });
      expect(request().headers.has("Authorization")).toBe(false);
    },
  );

  it.each(["manual", "paused"] as const)(
    "preserves zero monthly cost for %s",
    async (frequency) => {
      const data = { monthly_checks: 0, monthly_cost_cents: 0, runs_per_month: 0 };
      const { client, request } = harness(data);
      expect((await client.getCostEstimate({ frequency, keywords: 5 })).data).toEqual(data);
      expect(request().url.searchParams.get("frequency")).toBe(frequency);
      expect(request().url.searchParams.has("cron_expression")).toBe(false);
      expect(request().url.searchParams.has("depth")).toBe(false);
    },
  );

  it.each([undefined, "", "not a cron"])(
    "preserves unknown monthly estimates for cron %s",
    async (cron) => {
      const data = {
        monthly_billing_units: null,
        monthly_checks: null,
        monthly_cost_cents: null,
        monthly_cost_usd: null,
        effective_cost_per_check_cents: null,
        runs_per_month: null,
      };
      const { client, request } = harness(data);
      const options: GetCostEstimateOptions = { frequency: "custom_cron", keywords: 5 };
      if (cron !== undefined) options.cron_expression = cron;
      expect((await client.pricing.estimate(options)).data).toEqual(data);
      expect(request().url.searchParams.get("cron_expression")).toBe(cron ?? null);
    },
  );

  it("types depth, billing units and unknown monthly quantities without fabricating zeroes", () => {
    expectTypeOf<GetCostEstimateOptions["depth"]>().toEqualTypeOf<10 | 20 | 50 | 100 | undefined>();
    expectTypeOf<CostEstimate["depth"]>().toEqualTypeOf<10 | 20 | 50 | 100>();
    expectTypeOf<CostEstimate["monthly_checks"]>().toEqualTypeOf<number | null>();
    expectTypeOf<CostEstimate["monthly_billing_units"]>().toEqualTypeOf<number | null>();
    expectTypeOf<CostEstimate["runs_per_month"]>().toEqualTypeOf<number | null>();
    expectTypeOf<CostEstimate["result_pages_per_run"]>().toEqualTypeOf<number>();
    expectTypeOf<FlatCostEstimate["selected_option"]["unit_cost_usd"]>().toEqualTypeOf<number>();
    expectTypeOf<
      NonNullable<PlanCostEstimate["selected_plan"]>["monthly_price_usd"]
    >().toEqualTypeOf<number>();
  });

  it("types and preserves a plan estimate with unknown cadence and no selected plan", async () => {
    const data: PlanCostEstimate = {
      billing_units_per_check: 10,
      checks_per_run: 5,
      depth: 100,
      effective_cost_per_check_cents: null,
      exceeds_largest_plan: false,
      exceeds_selected_plan: false,
      monthly_billing_units: null,
      monthly_checks: null,
      monthly_cost_cents: null,
      monthly_cost_usd: null,
      pricing_model: "plan",
      provider_id: "serpapi",
      rate_checked_at: "2026-09-09",
      rate_source_url: "https://pricing.example.com/plans",
      result_pages_per_run: 50,
      runs_per_month: null,
    };
    const { client } = harness(data);
    const result = await client.pricing.estimate({
      frequency: "custom_cron",
      keywords: 5,
      provider: "serpapi",
    });
    expect(result.data).toEqual(data);
    expect(result.data).not.toHaveProperty("selected_plan");
  });
});
