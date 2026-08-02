import { UNSUPPORTED_API_VERSION_PROBLEM_TYPE } from "./api-version.js";
import type { ProblemDetails } from "./types.js";

export interface BisibilityApiErrorOptions {
  body: string | undefined;
  headers: Headers;
  method: string;
  problem: ProblemDetails | undefined;
  status: number;
  url: string;
}

export interface BisibilityApiVersionErrorOptions extends BisibilityApiErrorOptions {
  declaredApiVersion: string;
  serverApiVersions: readonly string[];
}

const SENSITIVE_RESPONSE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

function retryAfterSeconds(headers: Headers) {
  const value = headers.get("Retry-After")?.trim();
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? Math.min(seconds, 60) : null;
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) {
    return null;
  }
  return Math.min(Math.max(0, (date - Date.now()) / 1_000), 60);
}

function safeResponseHeaders(headers: Headers) {
  const safeHeaders = new Headers();
  for (const [name, value] of headers) {
    if (!SENSITIVE_RESPONSE_HEADERS.has(name.toLowerCase())) {
      safeHeaders.append(name, value);
    }
  }
  return safeHeaders;
}

export class BisibilityError extends Error {}

export class BisibilityApiError extends BisibilityError {
  readonly body: string | undefined;
  readonly headers: Headers;
  readonly method: string;
  readonly problem: ProblemDetails | undefined;
  readonly status: number;
  readonly url: string;

  constructor(message: string, options: BisibilityApiErrorOptions) {
    super(message);
    this.name = "BisibilityApiError";
    this.body = options.body;
    this.headers = safeResponseHeaders(options.headers);
    this.method = options.method;
    this.problem = options.problem;
    this.status = options.status;
    this.url = options.url;
  }

  get isRateLimit() {
    return this.status === 429;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get retryAfterSeconds() {
    return retryAfterSeconds(this.headers);
  }
}

export class BisibilityApiVersionError extends BisibilityApiError {
  readonly declaredApiVersion: string;
  readonly serverApiVersions: readonly string[];

  constructor(message: string, options: BisibilityApiVersionErrorOptions) {
    super(message, options);
    this.name = "BisibilityApiVersionError";
    this.declaredApiVersion = options.declaredApiVersion;
    this.serverApiVersions = Object.freeze([...options.serverApiVersions]);
  }
}

export function isUnsupportedApiVersionProblem(problem: ProblemDetails | undefined) {
  return problem?.type === UNSUPPORTED_API_VERSION_PROBLEM_TYPE;
}

export class BisibilityConfigurationError extends BisibilityError {
  constructor(message: string) {
    super(message);
    this.name = "BisibilityConfigurationError";
  }
}

export class BisibilityNetworkError extends BisibilityError {
  readonly cause: unknown;
  readonly method: string;
  readonly url: string;

  constructor(message: string, options: { cause: unknown; method: string; url: string }) {
    super(message, { cause: options.cause });
    this.name = "BisibilityNetworkError";
    this.cause = options.cause;
    this.method = options.method;
    this.url = options.url;
  }
}

export class BisibilityResponseError extends BisibilityError {
  readonly body: string;
  readonly cause: unknown;
  readonly method: string;
  readonly status: number;
  readonly url: string;

  constructor(
    message: string,
    options: { body: string; cause: unknown; method: string; status: number; url: string },
  ) {
    super(message, { cause: options.cause });
    this.name = "BisibilityResponseError";
    this.body = options.body;
    this.cause = options.cause;
    this.method = options.method;
    this.status = options.status;
    this.url = options.url;
  }
}
