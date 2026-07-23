import type { ListResponse, PaginationOptions } from "./types.js";

export type CursorPageFetcher<T, Options extends PaginationOptions> = (
  options: Options,
) => Promise<ListResponse<T>>;

/** Iterates every item returned by a cursor-paginated endpoint. */
export async function* iterateCursorPagination<T, Options extends PaginationOptions>(
  fetchPage: CursorPageFetcher<T, Options>,
  options: Options,
): AsyncGenerator<T, void, undefined> {
  let cursor = options.cursor;

  do {
    const { cursor: _initialCursor, ...filters } = options;
    const pageOptions = (cursor === undefined ? filters : { ...filters, cursor }) as Options;
    const page = await fetchPage(pageOptions);
    for (const item of page.data) {
      yield item;
    }
    cursor = page.meta.next_cursor ?? undefined;
  } while (cursor !== undefined);
}
