import { API_URL, ApiError, NetworkError, ResponseHandlingError } from "./client";

// Refresh tokens rotate, so two tabs refreshing at once with the same cookie make the
// loser fail with 401 and log the customer out. Refreshes are therefore single-flight:
//   1. in this tab, one shared promise;
//   2. across tabs, a Web Lock ('up-auth-refresh') so only one tab hits /auth/refresh at a time;
//   3. the winner broadcasts the new access token over a BroadcastChannel (memory only,
//      never persisted). A tab that waited on the lock reuses a token broadcast while it
//      waited instead of refreshing again. If the broadcast hasn't arrived it simply
//      refreshes itself — the cookie is by then the rotated one, so that also succeeds.
// Without navigator.locks, or if the lock can't be taken (sandboxed context, wait timeout),
// it degrades to refreshing directly; the server-side reuse grace window covers that race.
//
// The outcome is three-valued so callers log out ONLY when the server said the session is
// gone (401/403), never because of a flaky network, a timeout, a 5xx or a 429.

const LOCK_NAME = "up-auth-refresh";
const CHANNEL_NAME = "up-auth-refresh";
export const REFRESH_TIMEOUT_MS = 8000;
export const LOCK_WAIT_TIMEOUT_MS = 8000;

export type RefreshOutcome =
  | { kind: "token"; token: string }
  | { kind: "unauthenticated" }
  | { kind: "transient"; error: Error };

type ChannelMessage = { type: "token"; token: string } | { type: "logout" };

let inFlight: Promise<RefreshOutcome> | null = null;
let channel: BroadcastChannel | null = null;
let lastBroadcast: { token: string; at: number } | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev: MessageEvent<ChannelMessage>) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === "token" && typeof msg.token === "string") {
        lastBroadcast = { token: msg.token, at: Date.now() };
      } else if (msg.type === "logout") {
        lastBroadcast = null;
        void import("@/features/auth/clearDeviceUserData").then(({ endLocalSession }) => endLocalSession());
      }
    };
  } catch {
    channel = null;
  }
  return channel;
}

// Tells other tabs to drop their in-memory token and session after an explicit logout.
export function broadcastLogout(): void {
  lastBroadcast = null;
  getChannel()?.postMessage({ type: "logout" } satisfies ChannelMessage);
}

function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

const MAX_RETRY_AFTER_MS = 3000;

// 429 + Retry-After means another tab's rotation is still settling; one short wait then one retry usually succeeds.
function retryAfterMs(res: Response): number | null {
  const secs = Number(res.headers.get("Retry-After"));
  if (!Number.isFinite(secs) || secs < 0) return null;
  const ms = Math.max(secs * 1000, 250);
  return ms <= MAX_RETRY_AFTER_MS ? ms : null;
}

async function callRefresh(canRetry = true): Promise<RefreshOutcome> {
  const { signal, cancel } = timeoutSignal(REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal,
    });
    if (res.status === 401 || res.status === 403) return { kind: "unauthenticated" };
    if (res.status === 429 && canRetry) {
      const wait = retryAfterMs(res);
      if (wait !== null) {
        cancel();
        await new Promise((r) => setTimeout(r, wait));
        return callRefresh(false);
      }
    }
    if (!res.ok) return { kind: "transient", error: new ApiError(`Session refresh failed (${res.status})`, res.status) };
    const json = (await res.json()) as { data?: { access_token?: string } };
    const token = json.data?.access_token;
    if (!token) return { kind: "transient", error: new ResponseHandlingError("Refresh response had no access token") };
    return { kind: "token", token };
  } catch (err) {
    return { kind: "transient", error: new NetworkError(err instanceof Error ? err.message : undefined, err) };
  } finally {
    cancel();
  }
}

async function refreshOnce(startedAt: number): Promise<RefreshOutcome> {
  const ch = getChannel();
  // Another tab may have refreshed while we waited for the lock.
  if (lastBroadcast && lastBroadcast.at >= startedAt) return { kind: "token", token: lastBroadcast.token };

  const outcome = await callRefresh();
  if (outcome.kind === "token") {
    ch?.postMessage({ type: "token", token: outcome.token } satisfies ChannelMessage);
    return outcome;
  }
  // A 401 here must not log this tab out if another tab succeeded in the meantime.
  if (outcome.kind === "unauthenticated" && lastBroadcast && lastBroadcast.at >= startedAt) {
    return { kind: "token", token: lastBroadcast.token };
  }
  return outcome;
}

async function withLock(startedAt: number): Promise<RefreshOutcome> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks || typeof locks.request !== "function") return refreshOnce(startedAt);

  const { signal, cancel } = timeoutSignal(LOCK_WAIT_TIMEOUT_MS);
  try {
    // The abort only affects the wait; once granted, the callback always runs to completion.
    return (await locks.request(LOCK_NAME, { signal }, () => {
      cancel();
      return refreshOnce(startedAt);
    })) as RefreshOutcome;
  } catch {
    // Lock unavailable (SecurityError, sandboxed frame) or the wait timed out: refresh without it.
    return refreshOnce(startedAt);
  } finally {
    cancel();
  }
}

export function refreshSession(): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;
  const startedAt = Date.now();
  getChannel();
  const run: Promise<RefreshOutcome> = withLock(startedAt).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}
