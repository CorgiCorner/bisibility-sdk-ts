import type { BisibilityClient } from "./client.js";
import { BisibilityConfigurationError } from "./errors.js";
import type {
  ListPageIndexingUrlsOptions,
  PageIndexingReport,
  PageIndexingSettings,
  PageIndexingSettingsPatch,
  PageIndexingUrls,
} from "./page-indexing.js";
import { iterateCursorPagination } from "./pagination.js";
import { type TrackingTransport, trackingId } from "./prompt-tracker-transport.js";
import type { ProjectId, RequestOptions } from "./types.js";

export function createPageIndexingMethods(transport: TrackingTransport) {
  /** List stored Google indexed state, not a live test; results may be partial.
   * Never calls Google; history is optional and reports its own completeness. */
  function listPageIndexingUrls(
    projectId: ProjectId,
    options: ListPageIndexingUrlsOptions = {},
    requestOptions?: RequestOptions,
  ) {
    if (options.changedSince instanceof Date && Number.isNaN(options.changedSince.getTime())) {
      throw new BisibilityConfigurationError("changedSince must be a valid Date.");
    }
    return transport.request<PageIndexingUrls>(
      "GET",
      `/projects/${trackingId(projectId, "prj")}/search-index/urls`,
      {
        ...requestOptions,
        query: {
          group: options.group,
          coverage_state: options.coverageState,
          sitemap: options.sitemap,
          source: options.source,
          search: options.search,
          changed_since: options.changedSince,
          cursor: options.cursor,
          limit: options.limit,
          history: options.history,
        },
      },
    );
  }
  return {
    /** Read stored Google indexed state, not a live test; results may be partial.
     * Never calls Google; check completeness and freshness before interpreting totals. */
    getPageIndexingReport(projectId: ProjectId, options?: RequestOptions) {
      return transport.request<PageIndexingReport>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/search-index/report`,
        options,
      );
    },
    listPageIndexingUrls,
    /** Iterate stored Google indexed state, not a live test; results may be partial.
     * Follows next_cursor without calling Google. */
    iteratePageIndexingUrls(
      projectId: ProjectId,
      options: ListPageIndexingUrlsOptions = {},
      requestOptions?: RequestOptions,
    ) {
      return iterateCursorPagination(
        (page) => listPageIndexingUrls(projectId, page, requestOptions),
        options,
      );
    },
    /** Read settings for stored Google indexed state, not a live test; results may be partial.
     * Never calls Google; available_modes lists deployment-supported budget modes. */
    getPageIndexingSettings(projectId: ProjectId, options?: RequestOptions) {
      return transport.request<PageIndexingSettings>(
        "GET",
        `/projects/${trackingId(projectId, "prj")}/search-index/settings`,
        options,
      );
    },
    /** Update background settings without calling Google.
     * Stored results are Google's indexed state, not a live test, and may be partial. */
    updatePageIndexingSettings(
      projectId: ProjectId,
      input: PageIndexingSettingsPatch,
      options?: RequestOptions,
    ) {
      return transport.request<PageIndexingSettings>(
        "PATCH",
        `/projects/${trackingId(projectId, "prj")}/search-index/settings`,
        { ...options, body: input },
      );
    },
  };
}
export type PageIndexingMethods = ReturnType<typeof createPageIndexingMethods>;
export function installPageIndexingMethods(client: BisibilityClient, transport: TrackingTransport) {
  for (const [name, method] of Object.entries(createPageIndexingMethods(transport)))
    Object.defineProperty(client, name, { value: method, configurable: false, enumerable: false });
}
