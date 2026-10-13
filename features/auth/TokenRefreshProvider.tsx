"use client";

import { useEffect } from "react";
import { useAuthStore } from "./store";
import { endLocalSession } from "./clearDeviceUserData";
import { refreshTokens, getMe } from "@/lib/api";

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const _isHydrated     = useAuthStore((s) => s._isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token           = useAuthStore((s) => s.token);
  const setUser         = useAuthStore((s) => s.setUser);
  const setToken        = useAuthStore((s) => s.setToken);

  useEffect(() => {
    if (!_isHydrated) return;
    // Already have a token in memory — nothing to do
    if (!isAuthenticated || token) return;

    // isAuthenticated is true (from localStorage) but token is gone (page refresh).
    // Restore the session: refresh the access token then fetch the user profile.
    // No PII is kept in localStorage — profile always comes from the API.
    let cancelled = false;
    function attempt() {
      refreshTokens()
        .then(async (newToken) => {
          if (cancelled) return;
          if (!newToken) {
            endLocalSession();
            return;
          }
          const user = await getMe(newToken);
          if (cancelled) return;
          // getMe is null on any failure; the refresh itself succeeded, so keep the session and token.
          if (user) setUser(user, newToken);
          else setToken(newToken);
        })
        .catch(() => {
          // Transient (offline, timeout, 5xx, 429): keep the session and try again once we're back online.
          if (!cancelled) window.addEventListener("online", attempt, { once: true });
        });
    }
    attempt();
    return () => {
      cancelled = true;
      window.removeEventListener("online", attempt);
    };
  }, [_isHydrated, isAuthenticated, token, setUser, setToken]);

  return <>{children}</>;
}
