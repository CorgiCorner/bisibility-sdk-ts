import type { BisibilityClient } from "./client.js";
import { createPromptTrackerCatalogMethods } from "./prompt-tracker-catalog-methods.js";
import { createPromptTrackerRunMethods } from "./prompt-tracker-run-methods.js";
import type { TrackingTransport } from "./prompt-tracker-transport.js";

export function createPromptTrackerMethods(transport: TrackingTransport) {
  return {
    ...createPromptTrackerCatalogMethods(transport),
    ...createPromptTrackerRunMethods(transport),
  };
}
export type PromptTrackerMethods = ReturnType<typeof createPromptTrackerMethods>;
export function installPromptTrackerMethods(
  client: BisibilityClient,
  transport: TrackingTransport,
) {
  for (const [name, method] of Object.entries(createPromptTrackerMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
