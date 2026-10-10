/** Free provider capability discovery; model identifiers come from the current catalog. */
export interface AiResearchCatalog {
  models: Array<{
    id: string;
    provider: "chat_gpt";
    label: string;
    reasoning: boolean;
    web_search: boolean;
    min_output_tokens: number;
    max_output_tokens: number;
    price_available: boolean;
    admission_enabled: boolean;
    actual_cost_enabled: boolean;
  }>;
  visibility_markets: Array<{
    platform: "chat_gpt" | "google";
    location_code: number;
    country_name: string;
    languages: Array<{ code: string; name: string }>;
  }>;
  response_countries: Array<{ code: string; name: string }>;
  response_languages: Array<{ code: string; name: string }>;
  limits: { max_models: 2; max_output_tokens: 4096 };
  fetched_at: string;
  actual_cost_available?: boolean;
}
