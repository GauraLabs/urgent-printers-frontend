"use client";

import { useEffect } from "react";
import { useAuthStore } from "./store";
import { refreshTokens, getMe } from "@/lib/api";

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const _isHydrated     = useAuthStore((s) => s._isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token           = useAuthStore((s) => s.token);
  const setUser         = useAuthStore((s) => s.setUser);
  const clearUser       = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    if (!_isHydrated) return;
    // Already have a token in memory — nothing to do
    if (!isAuthenticated || token) return;

    // isAuthenticated is true (from localStorage) but token is gone (page refresh).
    // Restore the session: refresh the access token then fetch the user profile.
    // No PII is kept in localStorage — profile always comes from the API.
    refreshTokens().then(async (newToken) => {
      if (!newToken) {
        clearUser();
        return;
      }
      const user = await getMe(newToken);
      if (user) {
        setUser(user, newToken);
      } else {
        clearUser();
      }
    });
  }, [_isHydrated, isAuthenticated, token, setUser, clearUser]);

  return <>{children}</>;
}
