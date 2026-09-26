import type {
  BacklinksAnalyzeResult,
  BacklinksEstimate,
  BacklinksSnapshot,
  KeywordResearchEstimate,
  KeywordResearchResponse,
  KeywordResearchResult,
} from "./types.js";

/**
 * Narrows a backlinks result to the free cost-only dry run returned for `estimateOnly: true`.
 * An estimate carries no `summary`, `history`, or `rows`.
 */
export function isBacklinksEstimate(result: BacklinksAnalyzeResult): result is BacklinksEstimate {
  return result.estimate === true;
}

/** Narrows a backlinks result to the paid or cache-served snapshot. */
export function isBacklinksSnapshot(result: BacklinksAnalyzeResult): result is BacklinksSnapshot {
  return result.estimate !== true;
}

/**
 * Narrows a keyword research response to the free cost-only dry run returned for
 * `estimateOnly: true`. An estimate carries no `rows`, `fetched_at`, or source statuses.
 */
export function isKeywordResearchEstimate(
  response: KeywordResearchResponse,
): response is KeywordResearchEstimate {
  return response.estimate === true;
}

/** Narrows a keyword research response to the completed result. */
export function isKeywordResearchResult(
  response: KeywordResearchResponse,
): response is KeywordResearchResult {
  return response.estimate !== true;
}
