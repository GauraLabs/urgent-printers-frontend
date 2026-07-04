"use client";

import { useState, type FormEvent } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkServiceability } from "@/lib/api/shipping";
import type { ServiceabilityResult } from "@/types";

// Same regex discipline as lib/pincode.ts — 6 digits, checked before any request fires.
const PINCODE_RE = /^\d{6}$/;

type CheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ServiceabilityResult }
  | { status: "error" };

function formatEta(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DeliveryCheck() {
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState<CheckState>({ status: "idle" });

  const isValidFormat = PINCODE_RE.test(pincode);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidFormat || state.status === "loading") return;

    setState({ status: "loading" });
    try {
      const result = await checkServiceability(pincode);
      setState({ status: "success", result });
    } catch {
      setState({ status: "error" });
    }
  }

  function handlePincodeChange(value: string) {
    setPincode(value.replace(/\D/g, "").slice(0, 6));
    setState({ status: "idle" });
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
        <Truck size={13} />
        Check Delivery Date
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={pincode}
          onValueChange={(value) => handlePincodeChange(value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit pincode"
          aria-label="Pincode"
          className="h-10"
        />
        <Button
          type="submit"
          disabled={!isValidFormat || state.status === "loading"}
          className="h-10 px-4 shrink-0"
        >
          {state.status === "loading" ? <Loader2 size={14} className="animate-spin" /> : "Check"}
        </Button>
      </form>

      {state.status === "success" && state.result.isServiceable && state.result.estimatedDeliveryDate && (
        <Badge variant="success" className="mt-2.5">
          Delivery by {formatEta(state.result.estimatedDeliveryDate)}
        </Badge>
      )}

      {state.status === "success" && !state.result.isServiceable && (
        <Badge variant="destructive" className="mt-2.5">
          Not deliverable to this pincode
        </Badge>
      )}

      {state.status === "error" && (
        <p className="text-xs text-destructive mt-2.5">
          Couldn&apos;t check delivery right now. Please try again in a bit.
        </p>
      )}
    </div>
  );
}
