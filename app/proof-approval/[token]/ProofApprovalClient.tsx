"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, RefreshCw, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitProofDecision } from "@/lib/api/orders";
import type { ProofInfo } from "@/types";

type State = "idle" | "rejecting" | "submitting" | "done_approved" | "done_rejected" | "error";

interface Props {
  proofInfo: ProofInfo;
  token: string;
}

function getFileExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export default function ProofApprovalClient({ proofInfo, token }: Props) {
  const [state, setState] = useState<State>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const proofUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ""}/${proofInfo.file_key}`;
  const ext = getFileExt(proofInfo.original_filename);
  const isPdf = ext === "pdf";

  async function handleApprove() {
    setState("submitting");
    try {
      await submitProofDecision(token, "approved");
      setState("done_approved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.includes("expired") || msg.includes("already been used")) {
        setErrorMessage("This approval link has already been used or has expired.");
      } else if (msg.includes("409") || msg.includes("already been processed")) {
        setErrorMessage("This proof has already been processed.");
      } else {
        setErrorMessage("Something went wrong. Please try again or contact support.");
      }
      setState("error");
    }
  }

  async function handleSubmitRejection() {
    if (!rejectionReason.trim()) return;
    setState("submitting");
    try {
      await submitProofDecision(token, "rejected", rejectionReason.trim());
      setState("done_rejected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.includes("expired") || msg.includes("already been used")) {
        setErrorMessage("This approval link has already been used or has expired.");
      } else if (msg.includes("409") || msg.includes("already been processed")) {
        setErrorMessage("This proof has already been processed.");
      } else {
        setErrorMessage("Something went wrong. Please try again or contact support.");
      }
      setState("error");
    }
  }

  const isSubmitting = state === "submitting";

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <Link href="/" className="font-heading font-bold text-2xl text-primary hover:opacity-80 transition-opacity">
          Urgent Printers
        </Link>
      </div>

      {/* Proof header */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-1">
        <h1 className="font-heading font-semibold text-lg">
          Artwork Proof — v{proofInfo.version}
        </h1>
        <p className="text-sm text-muted-foreground">
          {proofInfo.order_number} · {proofInfo.product_name}
        </p>
        <p className="text-sm text-muted-foreground">
          Qty: {proofInfo.quantity.toLocaleString("en-IN")}
        </p>
      </div>

      {/* Proof file preview */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <p className="font-heading font-semibold text-sm">Your Artwork Proof</p>
        </div>
        <div className="p-4">
          {isPdf ? (
            <div className="space-y-3">
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                Download PDF to review
              </a>
              <iframe
                src={proofUrl}
                className="w-full h-[500px] rounded-xl border border-border"
                title="Artwork proof PDF"
              />
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={proofUrl}
              alt="Artwork proof"
              className="max-w-full rounded-xl border border-border"
            />
          )}
        </div>
      </div>

      {/* Action area */}
      {state === "done_approved" && (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-6 flex items-start gap-4">
          <CheckCircle size={24} className="text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-success">Artwork Approved</p>
            <p className="text-sm text-muted-foreground mt-1">
              Thank you! Your artwork is approved. We&apos;ll start printing shortly.
            </p>
          </div>
        </div>
      )}

      {state === "done_rejected" && (
        <div className="rounded-2xl border border-border bg-card p-6 flex items-start gap-4">
          <RefreshCw size={24} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Revision Requested</p>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ve received your feedback. Our team will upload a revised proof soon.
            </p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3">
          <XCircle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
            {/* Only show "Try again" for generic errors, not for already-used/processed links */}
            {!errorMessage.includes("already") && (
              <button
                onClick={() => { setState("idle"); setErrorMessage(""); }}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {(state === "idle" || state === "rejecting" || state === "submitting") && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Please review the artwork proof above carefully before making a decision.
          </p>

          {state !== "rejecting" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setState("rejecting")}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 h-11 rounded-xl border border-border text-sm font-semibold",
                  "hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                Request Revision
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-bold",
                  "bg-brand-orange text-brand-orange-foreground",
                  "hover:bg-brand-orange/90 transition-colors",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {isSubmitting ? "Approving…" : "Approve Artwork"}
              </button>
            </div>
          )}

          {state === "rejecting" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="rejection-reason" className="block text-sm font-medium mb-1.5">
                  What needs to be changed?
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Describe what you'd like us to fix or change in the artwork…"
                  rows={4}
                  className={cn(
                    "w-full rounded-xl border border-input bg-background px-3 py-2",
                    "text-sm placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    "resize-none"
                  )}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setState("idle"); setRejectionReason(""); }}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 h-11 rounded-xl border border-border text-sm font-semibold",
                    "hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitRejection}
                  disabled={isSubmitting || !rejectionReason.trim()}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-bold",
                    "bg-destructive text-white",
                    "hover:bg-destructive/90 transition-colors",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                  ) : (
                    "Submit Revision Request"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
