type Schema =
  | "unknown"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | { literal: string | number | boolean }
  | { ref: number }
  | { oneOf: Schema[] }
  | { array: Schema }
  | { emptyArray: true }
  | { object: Record<string, Schema>; optional?: Record<string, Schema> };

export interface SuccessContractData {
  operations: Record<string, Schema>;
  nodes: Schema[];
}

function matches(value: unknown, schema: Schema, nodes: Schema[]): boolean {
  if (schema === "unknown") return true;
  if (schema === "null") return value === null;
  if (typeof schema === "string") {
    if (schema === "number") return typeof value === "number" && Number.isFinite(value);
    if (schema === "string") return typeof value === "string";
    return typeof value === "boolean";
  }
  if ("literal" in schema) return value === schema.literal;
  if ("ref" in schema) return matches(value, nodes[schema.ref] as Schema, nodes);
  if ("oneOf" in schema) return schema.oneOf.some((variant) => matches(value, variant, nodes));
  if ("array" in schema)
    return Array.isArray(value) && value.every((item) => matches(item, schema.array, nodes));
  if ("emptyArray" in schema) return Array.isArray(value) && value.length === 0;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.entries(schema.object).every(
      ([key, field]) => Object.hasOwn(record, key) && matches(record[key], field, nodes),
    ) &&
    Object.entries(schema.optional ?? {}).every(
      ([key, field]) => !Object.hasOwn(record, key) || matches(record[key], field, nodes),
    )
  );
}

/** Validate required response fields while tolerating additional server fields. */
export function validateSuccessResponse(
  contracts: SuccessContractData,
  method: string,
  path: string,
  value: unknown,
) {
  const pathParts = path.split("/");
  const entry = Object.entries(contracts.operations).find(([operation]) => {
    const [verb, route] = operation.split(" ");
    const parts = route?.split("/");
    return (
      verb === method &&
      parts?.length === pathParts.length &&
      parts.every((part, index) => part === "*" || part === pathParts[index])
    );
  });
  if (!entry) throw new TypeError(`No success response contract for ${method} ${path}.`);
  if (!matches(value, entry[1], contracts.nodes)) {
    throw new TypeError(`Invalid required response envelope or value for ${method} ${path}.`);
  }
}
