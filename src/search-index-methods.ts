import type { BisibilityClient } from "./client.js";
import { BisibilityConfigurationError } from "./errors.js";
import { type TrackingTransport, trackingId } from "./prompt-tracker-transport.js";
import type {
  SearchIndexInspectionInput,
  SearchIndexInspections,
  SearchIndexSitemapResponse,
  SearchIndexSitemaps,
} from "./search-index.js";
import type { ProjectId, RequestOptions } from "./types.js";

function validateSitemapPath(path: unknown): void {
  const message = "Expected an absolute HTTP or HTTPS sitemap URL of 1-2048 characters.";
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path === "." ||
    path === ".." ||
    path.length > 2048
  )
    throw new BisibilityConfigurationError(message);
  let url: URL;
  try {
    url = new URL(path);
  } catch {
    throw new BisibilityConfigurationError(message);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new BisibilityConfigurationError(message);
}

export function createSearchIndexMethods(transport: TrackingTransport) {
  return {
    /** List connected sitemaps for Google's indexed state, not a live test; results may be partial. */
    listSearchIndexSitemaps(projectId: ProjectId, options?: RequestOptions) {
      return transport.request<SearchIndexSitemaps>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/search-index/sitemaps`,
        options,
      );
    },
    /** Read one sitemap for Google's indexed state, not a live test; results may be partial.
     * Pass the full sitemap URL; the SDK encodes it as one path segment. */
    getSearchIndexSitemap(projectId: ProjectId, path: string, options?: RequestOptions) {
      validateSitemapPath(path);
      return transport.request<SearchIndexSitemapResponse>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/search-index/sitemaps/${encodeURIComponent(path)}`,
        options,
      );
    },
    /** Ask Google for its indexed state for 1-10 URLs, not a live test; results may be partial.
     * Uses the shared daily allowance; check every result's error even on HTTP 200. */
    inspectSearchIndexUrls(
      projectId: ProjectId,
      input: SearchIndexInspectionInput,
      options?: RequestOptions,
    ) {
      return transport.request<SearchIndexInspections>(
        "POST",
        `/projects/${trackingId(projectId, "prj")}/search-index/inspections`,
        { ...options, body: input },
      );
    },
  };
}
export type SearchIndexMethods = ReturnType<typeof createSearchIndexMethods>;
export function installSearchIndexMethods(client: BisibilityClient, transport: TrackingTransport) {
  for (const [name, method] of Object.entries(createSearchIndexMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
