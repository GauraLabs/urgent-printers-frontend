export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

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
// If successful: updates the store + retries the original request transparently.
// If failed: clears the user session (AuthGuard handles redirect to login).

async function handleUnauthorized<T>(
  url: string,
  init: RequestInit | undefined,
  hasAuthHeader: boolean
): Promise<T | null> {
  // Only attempt refresh for authenticated requests (those with Bearer token).
  // Public endpoints returning 401 are a different kind of error — don't retry.
  if (!hasAuthHeader || typeof window === "undefined" || !API_URL) return null;

  try {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!refreshRes.ok) {
      // Refresh token expired — log the user out silently
      const { useAuthStore } = await import("@/features/auth/store");
      useAuthStore.getState().clearUser();
      return null;
    }

    const refreshData = await refreshRes.json() as { data?: { access_token: string } };
    const newToken = refreshData.data?.access_token;
    if (!newToken) return null;

    // Persist new token in memory
    const { useAuthStore } = await import("@/features/auth/store");
    useAuthStore.getState().setToken(newToken);

    // Retry the original request with the new token
    const retryRes = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${newToken}`,
      },
    });

    if (!retryRes.ok) return null; // retry also failed — fall through to error
    if (retryRes.status === 204) return undefined as T;

    const json: unknown = await retryRes.json();
    if (json !== null && typeof json === "object" && "data" in json) {
      return (json as { data: T }).data;
    }
    return json as T;
  } catch {
    return null;
  }
}

// ─── API client ────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      const hasAuth = !!(init?.headers as Record<string, string> | undefined)?.["Authorization"];
      const retryResult = await handleUnauthorized<T>(url, init, hasAuth);
      if (retryResult !== null) return retryResult;
    }

    let detail = "";
    try {
      const errJson = await res.json() as { message?: string; detail?: string };
      detail = errJson.message ?? errJson.detail ?? "";
    } catch { /* non-JSON error body */ }
    throw new Error(detail || `API ${res.status}: ${path}`);
  }

  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json();
  if (json !== null && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function apiFetchPage<T>(path: string, init?: RequestInit): Promise<BackendPage<T>> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<BackendPage<T>>;
}
