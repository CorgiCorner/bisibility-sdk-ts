import { createAiTrackingCatalogMethods } from "./ai-tracking-catalog-methods.js";
import { createAiTrackingRunMethods } from "./ai-tracking-run-methods.js";
import { createAiTrackingSuggestionMethods } from "./ai-tracking-suggestion-methods.js";
import type { TrackingTransport } from "./ai-tracking-transport.js";
import type { BisibilityClient } from "./client.js";

export function createAiTrackingMethods(transport: TrackingTransport) {
  return {
    ...createAiTrackingCatalogMethods(transport),
    ...createAiTrackingRunMethods(transport),
    ...createAiTrackingSuggestionMethods(transport),
  };
}
export type AiTrackingMethods = ReturnType<typeof createAiTrackingMethods>;
export function installAiTrackingMethods(client: BisibilityClient, transport: TrackingTransport) {
  for (const [name, method] of Object.entries(createAiTrackingMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
