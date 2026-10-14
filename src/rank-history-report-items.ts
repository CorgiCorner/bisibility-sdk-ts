import type { KeywordId, RankCheckId } from "./types.js";

/** Normalized retained values only. A CID is an opaque string, never a number. */
export interface RankHistoryReportNormalizedItem {
  id: string;
  check_id: RankCheckId;
  keyword_id: KeywordId;
  checked_at: string;
  check_recorded_at: string;
  observed_at: string | null;
  recorded_at: string;
  requested_at: string | null;
  source_observed_at: string | null;
  block_position: number | null;
  business_name: string | null;
  cid: string | null;
  domain: string | null;
  maps_url: string | null;
  ordinal: number;
  place_id: string | null;
  position_in_block: number | null;
  rank_absolute: number | null;
  rank_group: number | null;
  rank_scale: string | null;
  promotion: string | null;
  source_page: number | null;
  source_block_id: string | null;
  source_ordinal: number | null;
  result_kind: string;
  title: string | null;
  url: string | null;
}
