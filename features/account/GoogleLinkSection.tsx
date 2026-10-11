"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { linkGoogleAccount, passwordErrorMessage } from "@/lib/api/auth";

const GSI_POLL_MS = 250;
const GSI_POLL_MAX = 40;

// Renders Google's own button (GSI renderButton) rather than calling One Tap
// prompt(): prompt() is silently suppressed after a dismissal (cooldown) or by
// browser settings, leaving a button that does nothing. A rendered button
// always opens the account chooser.
export function GoogleLinkSection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [linking, setLinking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const showButton = !!user && user.googleLinked === false;

  useEffect(() => {
    if (!showButton) return;
    let cancelled = false;
    let attempts = 0;

    function mount() {
      if (cancelled) return;
      const target = buttonRef.current;
      if (!window.google || !target) {
        if (++attempts > GSI_POLL_MAX) setUnavailable(true);
        else setTimeout(mount, GSI_POLL_MS);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        auto_select: false,
        callback: async ({ credential }) => {
          const accessToken = useAuthStore.getState().token;
          setLinking(true);
          try {
            if (!accessToken) throw new Error("Session expired");
            const updated = await linkGoogleAccount(accessToken, credential);
            setUser({ ...updated, googleLinked: updated.googleLinked ?? true }, accessToken);
            toast.success("Google account linked.");
          } catch (err) {
            toast.error(passwordErrorMessage(err, "Could not link your Google account. Please try again."));
          } finally {
            setLinking(false);
          }
        },
      });
      window.google.accounts.id.renderButton(target, { type: "standard", theme: "outline", size: "large", text: "continue_with" });
    }
    mount();
    return () => {
      cancelled = true;
    };
  }, [showButton, setUser]);

  if (!user || user.googleLinked === undefined) return null;

  return (
    <section className="space-y-3" aria-labelledby="google-heading">
      <h2 id="google-heading" className="font-heading font-semibold text-lg">Google account</h2>
      {user.googleLinked ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check size={16} aria-hidden /> Linked
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Link your Google account to sign in with Google next time.
          </p>
          <div ref={buttonRef} aria-busy={linking} className={linking ? "opacity-60 pointer-events-none" : undefined} />
          {linking && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <Loader2 size={14} className="animate-spin" /> Linking…
            </p>
          )}
          {unavailable && (
            <p role="alert" className="text-xs text-destructive">
              Google sign-in is not ready. Please refresh the page and try again.
            </p>
          )}
        </>
      )}
    </section>
  );
}
