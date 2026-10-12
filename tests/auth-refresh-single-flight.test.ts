import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type Refresh = () => Promise<string | null>;

class FakeChannel {
  static all: FakeChannel[] = [];
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(public name: string) { FakeChannel.all.push(this); }
  postMessage(data: unknown): void {
    for (const c of FakeChannel.all) if (c !== this) c.onmessage?.({ data } as MessageEvent);
  }
}

function ok(token: string): Response {
  return new Response(JSON.stringify({ data: { access_token: token } }), { status: 200 });
}

async function freshModule(): Promise<Refresh> {
  vi.resetModules();
  const { refreshSession } = await import("@/lib/api/refreshSession");
  return async () => {
    const o = await refreshSession();
    return o.kind === "token" ? o.token : null;
  };
}

beforeEach(() => { FakeChannel.all = []; vi.stubGlobal("BroadcastChannel", FakeChannel); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("refreshAccessToken", () => {
  it("shares one request between concurrent callers in a tab", async () => {
    const fetchMock = vi.fn(async () => ok("a"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { locks: undefined });
    const refresh = await freshModule();
    const [x, y] = await Promise.all([refresh(), refresh()]);
    expect([x, y]).toEqual(["a", "a"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("works without navigator.locks and returns null on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    vi.stubGlobal("navigator", {});
    const refresh = await freshModule();
    expect(await refresh()).toBeNull();
  });

  it("takes the lock, and a waiting tab reuses the token broadcast by the winner", async () => {
    let held: Promise<unknown> = Promise.resolve();
    const locks = {
      request: vi.fn((_name: string, _opts: unknown, cb: () => Promise<unknown>) => {
        const run = held.then(cb);
        held = run.catch(() => undefined);
        return run;
      }),
    };
    vi.stubGlobal("navigator", { locks });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok("from-A"))
      .mockResolvedValueOnce(ok("from-B"));
    vi.stubGlobal("fetch", fetchMock);

    const tabA = await freshModule();
    const tabB = await freshModule();
    const pa = tabA();
    const pb = tabB();

    expect(await pa).toBe("from-A");
    expect(await pb).toBe("from-A");
    expect(locks.request).toHaveBeenCalledWith("up-auth-refresh", expect.objectContaining({ signal: expect.anything() }), expect.any(Function));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a 401 in one tab does not fail it when another tab already succeeded", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    vi.stubGlobal("fetch", vi.fn(async () => {
      FakeChannel.all[0].onmessage?.({ data: { type: "token", token: "other-tab" } } as MessageEvent);
      return new Response("{}", { status: 401 });
    }));
    const refresh = await freshModule();
    expect(await refresh()).toBe("other-tab");
  });

  it("never writes the token to web storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", vi.fn(async () => ok("secret")));
    vi.stubGlobal("navigator", { locks: undefined });
    const refresh = await freshModule();
    await refresh();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe("refreshSession outcomes", () => {
  async function outcome() {
    vi.resetModules();
    const { refreshSession } = await import("@/lib/api/refreshSession");
    return refreshSession();
  }
  beforeEach(() => { vi.stubGlobal("navigator", { locks: undefined }); });

  it("a thrown fetch is transient, not unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect((await outcome()).kind).toBe("transient");
  });
  it.each([429, 500, 503])("%i is transient", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
    expect((await outcome()).kind).toBe("transient");
  });
  it.each([401, 403])("%i is unauthenticated", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
    expect((await outcome()).kind).toBe("unauthenticated");
  });
  it("429 with Retry-After retries once and succeeds without logging out", async () => {
    vi.useFakeTimers();
    try {
      vi.resetModules();
      const { refreshSession } = await import("@/lib/api/refreshSession");
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "1" } }))
        .mockResolvedValueOnce(ok("after-retry"));
      vi.stubGlobal("fetch", fetchMock);
      const p = refreshSession();
      await vi.advanceTimersByTimeAsync(1100);
      expect(await p).toEqual({ kind: "token", token: "after-retry" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("a second 429 stays transient (never unauthenticated)", async () => {
    vi.useFakeTimers();
    try {
      vi.resetModules();
      const { refreshSession } = await import("@/lib/api/refreshSession");
      const fetchMock = vi.fn(async () => new Response("{}", { status: 429, headers: { "Retry-After": "1" } }));
      vi.stubGlobal("fetch", fetchMock);
      const p = refreshSession();
      await vi.advanceTimersByTimeAsync(1100);
      expect((await p).kind).toBe("transient");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("a hung refresh times out as transient and inFlight resets", async () => {
    vi.useFakeTimers();
    try {
      vi.resetModules();
      const { refreshSession, REFRESH_TIMEOUT_MS } = await import("@/lib/api/refreshSession");
      vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => new Promise((_r, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })));
      const p = refreshSession();
      await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS + 10);
      expect((await p).kind).toBe("transient");
      vi.stubGlobal("fetch", vi.fn(async () => ok("again")));
      const next = await refreshSession();
      expect(next).toEqual({ kind: "token", token: "again" });
    } finally {
      vi.useRealTimers();
    }
  });
  it("gives up waiting for a stuck lock and refreshes without it", async () => {
    vi.useFakeTimers();
    try {
      vi.resetModules();
      const { refreshSession, LOCK_WAIT_TIMEOUT_MS } = await import("@/lib/api/refreshSession");
      vi.stubGlobal("navigator", {
        locks: {
          request: (_n: string, opts: { signal: AbortSignal }) =>
            new Promise((_r, reject) => opts.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
        },
      });
      const fetchMock = vi.fn(async () => ok("no-lock"));
      vi.stubGlobal("fetch", fetchMock);
      const p = refreshSession();
      await vi.advanceTimersByTimeAsync(LOCK_WAIT_TIMEOUT_MS + 10);
      expect(await p).toEqual({ kind: "token", token: "no-lock" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it("falls back when locks.request throws synchronously (SecurityError)", async () => {
    vi.stubGlobal("navigator", { locks: { request: () => { throw new DOMException("denied", "SecurityError"); } } });
    vi.stubGlobal("fetch", vi.fn(async () => ok("fallback")));
    expect(await outcome()).toEqual({ kind: "token", token: "fallback" });
  });
});

describe("401 handling keeps or drops the session correctly", () => {
  async function run(refreshStatus: number | "throw") {
    vi.resetModules();
    vi.stubGlobal("navigator", { locks: undefined });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        if (refreshStatus === "throw") throw new TypeError("Failed to fetch");
        return refreshStatus === 200 ? ok("new") : new Response("{}", { status: refreshStatus });
      }
      return new Response(JSON.stringify({ data: { fine: true } }), { status: url.includes("retry") ? 200 : 401 });
    }));
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    const { apiFetch } = await import("@/lib/api/client");
    const { useAuthStore } = await import("@/features/auth/store");
    useAuthStore.setState({ isAuthenticated: true, token: "old" });
    const err = await apiFetch("/orders", { headers: { Authorization: "Bearer old" } }).catch((e: unknown) => e);
    return { err, state: useAuthStore.getState() };
  }

  it("refresh throwing does not log out", async () => {
    const { state } = await run("throw");
    expect(state.isAuthenticated).toBe(true);
  });
  it("refresh 503 does not log out", async () => {
    const { state } = await run(503);
    expect(state.isAuthenticated).toBe(true);
  });
  it("refresh 401 logs out", async () => {
    const { state } = await run(401);
    expect(state.isAuthenticated).toBe(false);
  });
});
