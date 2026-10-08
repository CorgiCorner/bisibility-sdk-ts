import type { PublicIdForPrefix } from "./public-id.js";
import type { PaginationOptions } from "./types.js";

export type AgentReportId = PublicIdForPrefix<"agr">;

export interface ProjectContextInput {
  business: string;
  audience: string;
  products: string;
  goals: string;
  agent_rules: string;
}

export interface ProjectContext extends ProjectContextInput {
  updated_at: string | null;
}

export interface AgentReportSummary {
  id: AgentReportId;
  title: string;
  kind: string;
  created_at: string;
}

export interface AgentReport extends AgentReportSummary {
  body: Record<string, unknown>;
  provenance: Record<string, unknown>;
}

export interface CreateAgentReportInput {
  /** External analysis kind. site_audit, ai_visibility and prompt_explorer are reserved. */
  kind: string;
  title: string;
  body: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

export interface ListAgentReportsOptions extends PaginationOptions {
  kind?: string;
}

export interface AiAnalysisInput {
  brand: string;
  /** Public hostname without a scheme or path. */
  domain: string;
  /** Maximum accepted provider cost. Cache reads and estimates do not spend credits. */
  max_cost_cents: number;
  estimate_only?: boolean;
  fresh?: boolean;
}

export interface AnalyzeAiVisibilityInput extends AiAnalysisInput {
  platform?: "chat_gpt" | "google";
  target_type?: "brand" | "domain";
  language_code?: string;
  location_code?: number;
  limit?: number;
}

export interface CompareAiPromptsInput extends AiAnalysisInput {
  prompt: string;
  models?: Array<"gpt-4.1-mini" | "gpt-4.1-nano">;
}

export type AiEvidence = "observed_dataset" | "synthetic_prompt_test";

export interface AiAnalysisRow {
  prompt: string;
  model: string;
  answer: string;
  observed_at: string | null;
  brand_mentioned: boolean;
  domain_cited: boolean;
  citations: Array<{ title: string; url: string; target_domain: boolean }>;
  content_truncated?: boolean;
}

export interface AiAnalysisResult {
  evidence: AiEvidence;
  rows: AiAnalysisRow[];
  total_available: number | null;
  truncated: boolean;
  fetched_at: string;
  cost_cents: number;
  cost_status: "confirmed" | "unknown";
  failure: string | null;
}

export type AiAnalysisOutcome =
  | { ok: true; estimate: true; estimated_cost_cents: number; evidence: AiEvidence }
  | {
      ok: true;
      estimate: false;
      cached: boolean;
      report_id: AgentReportId;
      cost_cents: number;
      result: AiAnalysisResult;
    };

export interface RunSiteAuditInput {
  /** Maximum pages in the bounded crawl, from 1 to 15. Defaults to 10. */
  max_pages?: number;
}

export interface SiteAuditIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface SiteAuditPage {
  url: string;
  final_url: string;
  status: number | null;
  response_time_ms: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  headings: Array<{ level: number; text: string }>;
  h1_count: number;
  indexable: boolean;
  robots: string | null;
  internal_link_count: number;
  external_link_count: number;
  internal_links: string[];
  image_count: number;
  missing_alt_count: number;
  issues: SiteAuditIssue[];
}

export interface SiteAuditResult {
  version: 1;
  target: string;
  started_at: string;
  completed_at: string;
  state: "complete" | "partial";
  stop_reason: "finished" | "page_limit" | "time_limit" | "request_limit";
  limits: {
    max_pages: number;
    max_requests: number;
    max_duration_ms: number;
    max_page_bytes: number;
  };
  requests: number;
  pages: SiteAuditPage[];
  summary: { pages: number; errors: number; warnings: number; indexable: number };
  limitations: string[];
}

export interface SiteAudit {
  id: AgentReportId;
  created_at: string;
  cached: boolean;
  result: SiteAuditResult;
}
