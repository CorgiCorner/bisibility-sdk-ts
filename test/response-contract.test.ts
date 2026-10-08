import { describe, expect, it } from "vitest";
import { successContractData } from "../src/response-contract-data.js";
import { type SuccessContractData, validateSuccessResponse } from "../src/response-contract.js";

const contracts: SuccessContractData = {
  operations: { "GET /items/*": { ref: 0 } },
  nodes: [
    {
      object: {
        count: "number",
        enabled: "boolean",
        label: "string",
        metadata: "unknown",
        nothing: "null",
        rows: { array: { oneOf: [{ literal: "ready" }, { literal: 2 }] } },
        empty: { emptyArray: true },
      },
      optional: { note: "string" },
    },
  ],
};
const valid = {
  count: 3,
  enabled: true,
  label: "Example",
  metadata: { extra: 1 },
  nothing: null,
  rows: ["ready", 2],
  empty: [],
};

describe("operation success contracts", () => {
  it("rejects a missing required envelope for every SDK operation", () => {
    for (const operation of Object.keys(successContractData.operations)) {
      const [method, path] = operation.split(" ");
      expect(
        () => validateSuccessResponse(successContractData, method as string, path as string, {}),
        operation,
      ).toThrow();
    }
  });

  it("checks nested required fields and permits additional server properties", () => {
    expect(() =>
      validateSuccessResponse(contracts, "GET", "/items/first", { ...valid, future: true }),
    ).not.toThrow();
    expect(() =>
      validateSuccessResponse(contracts, "GET", "/items/first", { ...valid, note: "hello" }),
    ).not.toThrow();
    for (const value of [
      null,
      [],
      "bad",
      { ...valid, count: Number.POSITIVE_INFINITY },
      { ...valid, enabled: "yes" },
      { ...valid, label: null },
      { ...valid, nothing: false },
      { ...valid, rows: "ready" },
      { ...valid, rows: [false] },
      { ...valid, empty: [1] },
      { ...valid, note: 3 },
      { ...valid, empty: {} },
      { ...valid, rows: [{}] },
    ])
      expect(() => validateSuccessResponse(contracts, "GET", "/items/first", value)).toThrow();
    const { label: _label, ...missing } = valid;
    expect(() => validateSuccessResponse(contracts, "GET", "/items/first", missing)).toThrow();
  });

  it("refuses unknown methods and routes rather than silently skipping validation", () => {
    expect(() => validateSuccessResponse(contracts, "POST", "/items/first", valid)).toThrow(
      "No success response contract",
    );
    expect(() => validateSuccessResponse(contracts, "GET", "/missing", valid)).toThrow(
      "No success response contract",
    );
  });
});
