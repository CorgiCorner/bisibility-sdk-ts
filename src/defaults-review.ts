import { BisibilityConfigurationError } from "./errors.js";
import type {
  CapabilitiesResponse,
  ProjectDefaultsPatch,
  ProjectId,
  RequestOptions,
} from "./types.js";

/** Opaque, issuer-bound evidence from the server. Never construct it from local settings. */
export interface ProjectDefaultsReview {
  expected_source_hash: string;
  expected_revision: string;
  preview_token: string;
  idempotency_key: string;
  confirmed: true;
}
export interface ProjectDefaultsPreview {
  request: { kind: "patch"; values: ProjectDefaultsPatch & { project_id: ProjectId } };
  draft: Omit<
    ProjectDefaultsPatch,
    | "country"
    | "device"
    | "location_key"
    | "frequency"
    | "timezone"
    | "jitter_minutes"
    | "serp_depth"
    | "serp_stop_on_match"
  > & {
    project_id: ProjectId;
    country: string;
    device: string;
    location_key: string;
    frequency: string;
    timezone: string;
    jitter_minutes: number;
    serp_depth: number;
    serp_stop_on_match: boolean;
  };
  expected_source_hash: string;
  expected_revision: string;
  preview_token: string;
  expires_at: string;
  resolved: { location_key: string; label: string; language_code: string; device: string };
  impact: {
    existing_target_retargets: number;
    new_targets: number;
    inherited_depth_targets: number;
    recurring_estimate: string;
    scope_changed: boolean;
    cadence_changed: boolean;
  };
  policy_ready: boolean;
}
export type ReviewedProjectDefaultsPatch = ProjectDefaultsPatch & {
  review?: ProjectDefaultsReview;
};

/** Keep ambiguous-response retries on the same reviewed command; never mint a new key. */
export function reviewedDefaultsOptions(
  input: ReviewedProjectDefaultsPatch,
  options?: RequestOptions,
): RequestOptions {
  if (input.review === undefined) return options ?? {};
  const r = input.review;
  const keys = [
    "expected_source_hash",
    "expected_revision",
    "preview_token",
    "idempotency_key",
    "confirmed",
  ];
  if (
    !r ||
    typeof r !== "object" ||
    Object.keys(r).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(r, key)) ||
    typeof r.expected_source_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(r.expected_source_hash) ||
    typeof r.expected_revision !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(r.expected_revision) ||
    typeof r.preview_token !== "string" ||
    r.preview_token.length < 1 ||
    r.preview_token.length > 8192 ||
    typeof r.idempotency_key !== "string" ||
    r.idempotency_key !== r.idempotency_key.trim() ||
    Array.from(r.idempotency_key).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    r.idempotency_key.trim().length < 8 ||
    r.idempotency_key.trim().length > 128 ||
    r.confirmed !== true
  ) {
    throw new BisibilityConfigurationError("A complete explicit defaults review is required.");
  }
  const key = r.idempotency_key.trim();
  if (options?.idempotencyKey !== undefined && options.idempotencyKey.trim() !== key)
    throw new BisibilityConfigurationError("Defaults review and request command keys must agree.");
  try {
    new Headers({ "Idempotency-Key": key });
  } catch {
    throw new BisibilityConfigurationError(
      "Defaults review command key must be a valid HTTP header value.",
    );
  }
  return { ...options, idempotencyKey: key };
}

export function validateDefaultsPreview(path: string, value: unknown) {
  if (
    !/^\/projects\/[^/]+\/defaults$/.test(path) ||
    !value ||
    typeof value !== "object" ||
    !("request" in value)
  )
    return;
  const p = value as ProjectDefaultsPreview;
  const project = decodeURIComponent(path.split("/")[2] ?? "");
  if (
    p.request.values.project_id !== project ||
    p.draft.project_id !== project ||
    !/^[a-f0-9]{64}$/.test(p.expected_source_hash) ||
    !/^(0|[1-9][0-9]*)$/.test(p.expected_revision) ||
    p.preview_token.length < 1 ||
    p.preview_token.length > 8192 ||
    !Number.isFinite(Date.parse(p.expires_at))
  )
    throw new TypeError("Invalid defaults preview binding.");
}

/** Old v1 servers ignore preview_only, so no PATCH is safe without explicit support. */
export function assertReviewedDefaultsSupport(capabilities: CapabilitiesResponse) {
  const features = capabilities.features;
  if (
    !features ||
    typeof features !== "object" ||
    Array.isArray(features) ||
    Reflect.get(features, "reviewed_project_defaults") !== "v1"
  )
    throw new BisibilityConfigurationError(
      "This server does not advertise reviewed project defaults v1; no PATCH was sent.",
    );
}
