"use client";

import { useMounted } from "@/hooks/useMounted";
import { useConsent } from "@/hooks/useConsent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<"accepted" | "rejected" | "undecided", string> = {
  accepted: "You've accepted analytics cookies.",
  rejected: "You've rejected non-essential cookies.",
  undecided: "You haven't made a choice yet — the banner will appear on your next page load.",
};

export function CookiePreferencesManager() {
  const mounted = useMounted();
  const { status, accept, reject, reset } = useConsent();

  return (
    <div className="not-prose rounded-2xl border border-border bg-muted/40 p-4 sm:p-5 my-4">
      <p className="text-sm font-medium text-foreground mb-3">
        {mounted ? STATUS_LABEL[status] : "Loading your preference…"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={accept}
          disabled={!mounted}
          className={cn(mounted && status === "accepted" && "ring-2 ring-ring/50")}
        >
          Accept analytics cookies
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={reject}
          disabled={!mounted}
          className={cn(mounted && status === "rejected" && "ring-2 ring-ring/50")}
        >
          Reject non-essential cookies
        </Button>
        {mounted && status !== "undecided" && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset choice
          </Button>
        )}
      </div>
    </div>
  );
}
