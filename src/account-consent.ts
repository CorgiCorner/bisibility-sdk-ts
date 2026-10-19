/** Account analytics permission. Browser replay is intentionally separate. */
export type AccountAnalyticsConsent = {
  analytics: boolean;
  decided_at: string | null;
  source: "web" | "ios" | "api" | null;
  version: number;
};

/** Explicit, idempotent account analytics decision. */
export type UpdateAnalyticsConsentInput = { analytics: boolean };
