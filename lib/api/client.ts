import { logApiError } from "./logApiError";
import { codedErrorMessage, formatValidationDetail } from "./validationErrors";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

// Carries the HTTP status code alongside the server's error message so
// callers that need to branch on specific statuses (403/404/409/422, etc.)
// don't have to parse it back out of a generic Error's message string.
// `code` carries the backend's `error` field (see backend app/core/exceptions.py
// `_error_response`) so callers can branch on a specific failure kind — e.g.
// distinguishing a 503 "orders_halted" from a generic 503 infrastructure
// outage — without string-matching `message`.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  // Parsed error body, for codes that carry extra fields (e.g. previous_payment_* order ids).
  readonly body?: unknown;

  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

// fetch() itself rejected: offline, DNS failure, connection refused, CORS/TLS. No HTTP response
// exists, so the request may or may not have reached the server.
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(message = "Network request failed", cause?: unknown) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

// The server answered 2xx but we couldn't read or map the result. The server-side effect
// (e.g. a created order) has happened; this is NOT a connectivity problem.
export class ResponseHandlingError extends Error {
  readonly cause?: unknown;

  constructor(message = "Could not read the server response", cause?: unknown) {
    super(message);
    this.name = "ResponseHandlingError";
    this.cause = cause;
  }
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // Only fetch's own rejections (TypeError / DOMException) are connectivity; anything else is a bug and propagates.
    if (err instanceof TypeError || err instanceof DOMException) throw new NetworkError(err.message, err);
    throw err;
  }
}

export interface BackendMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface BackendPage<T> {
  data: T[];
  message: string;
  meta: BackendMeta;
}

// ─── Token refresh interceptor ────────────────────────────────────────────────
// Called when any authenticated request returns 401.
// Tries to get a new access token via the httpOnly refresh cookie.
// If successful: updates the store + retries the original request transparently,
// returning the raw retried Response for the caller to parse.
// If failed: clears the user session (AuthGuard handles redirect to login).
//
// Shared by apiFetch and apiFetchPage so every authenticated caller gets the
// same 401 -> refresh -> retry-once behavior, regardless of response shape.

async function handleUnauthorized(
  url: string,
  init: RequestInit | undefined,
  hasAuthHeader: boolean
): Promise<Response | null> {
  // Only attempt refresh for authenticated requests (those with Bearer token).
  // Public endpoints returning 401 are a different kind of error — don't retry.
  if (!hasAuthHeader || typeof window === "undefined" || !API_URL) return null;

  try {
    const { refreshSession } = await import("./refreshSession");
    const { useAuthStore } = await import("@/features/auth/store");
    const { endLocalSession } = await import("@/features/auth/clearDeviceUserData");
    const outcome = await refreshSession();

    if (outcome.kind === "unauthenticated") {
      // The server says the session is gone — log the user out silently
      endLocalSession();
      return null;
    }
    // Offline / timeout / 5xx / 429: keep the session and let the caller see the real failure.
    if (outcome.kind === "transient") throw outcome.error;

    // A logout while the refresh was in flight must not be undone by its late token.
    if (!useAuthStore.getState().isAuthenticated) return null;
    const newToken = outcome.token;
    useAuthStore.getState().setToken(newToken);

    // Retry the original request with the new token
    const retryRes = await safeFetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${newToken}`,
      },
    });

    return retryRes.ok ? retryRes : null; // retry also failed — fall through to error
  } catch (err) {
    if (err instanceof NetworkError || err instanceof ApiError) throw err;
    logApiError("handleUnauthorized", err);
    return null;
  }
}

// A 2xx whose body isn't JSON is a captive portal / proxy page, not our API: treat it as connectivity.
async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new NetworkError("Unexpected non-JSON response", err);
  }
}

async function parseSuccess<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const json = await readJson(res);
  if (json !== null && typeof json === "object" && "data" in json) return (json as { data: T }).data;
  return json as T;
}

// ─── API client ────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await safeFetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.ok) return parseSuccess<T>(res);

  if (res.status === 401) {
    const hasAuth = !!(init?.headers as Record<string, string> | undefined)?.["Authorization"];
    const retryRes = await handleUnauthorized(url, init, hasAuth);
    if (retryRes) return parseSuccess<T>(retryRes);
  }

  let detail = "";
  let code: string | undefined;
  let body: unknown;
  try {
    const errJson = await res.json() as { message?: unknown; detail?: unknown; error?: string };
    detail = formatValidationDetail(errJson.message) ?? formatValidationDetail(errJson.detail) ?? "";
    code = errJson.error;
    body = errJson;
  } catch (err) {
    logApiError(`apiFetch(${path}) — non-JSON error body`, err);
  }
  throw new ApiError(codedErrorMessage(code, detail) ?? (detail || `API ${res.status}: ${path}`), res.status, code, body);
}

async function parseSuccessPage<T>(res: Response): Promise<BackendPage<T>> {
  return (await readJson(res)) as BackendPage<T>;
}

export async function apiFetchPage<T>(path: string, init?: RequestInit): Promise<BackendPage<T>> {
  const url = `${API_URL}${path}`;
  const res = await safeFetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (res.ok) return parseSuccessPage<T>(res);

  if (res.status === 401) {
    const hasAuth = !!(init?.headers as Record<string, string> | undefined)?.["Authorization"];
    const retryRes = await handleUnauthorized(url, init, hasAuth);
    if (retryRes) return parseSuccessPage<T>(retryRes);
  }

  throw new ApiError(`API ${res.status}: ${path}`, res.status);
}
