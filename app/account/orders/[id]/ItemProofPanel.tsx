"use client";

import { useState, useEffect } from "react";
import { ChevronDown, CheckCircle, RefreshCw, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store";
import { getOrderItemProof, submitOrderItemProofDecision } from "@/lib/api/orders";
import type { ItemProofInfo } from "@/types";

type ActionState =
  | "idle"
  | "rejecting"
  | "submitting"
  | "done_approved"
  | "done_rejected"
  | "error";

interface Props {
  orderId: string;
  itemId: string;
  artworkStatus: string;
}

function getFileExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export default function ItemProofPanel({ orderId, itemId, artworkStatus }: Props) {
  const token = useAuthStore((s) => s.token);

  // undefined = still loading, null = not found / error (render nothing), ItemProofInfo = loaded
  const [proof, setProof] = useState<ItemProofInfo | null | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (artworkStatus !== "sent_for_approval" || !token) return;

    getOrderItemProof(orderId, itemId, token).then((data) => {
      setProof(data); // null if not found/error
    });
  }, [orderId, itemId, artworkStatus, token]);

  if (artworkStatus !== "sent_for_approval") return null;

  // Loading: fetch in flight
  if (proof === undefined) {
    return (
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          Loading proof…
        </div>
      </div>
    );
  }

  // Proof not found or fetch errored — render nothing
  if (proof === null) return null;

  const proofUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ""}/${proof.file_key}`;
  const isPdf = getFileExt(proof.original_filename) === "pdf";
  const isSubmitting = actionState === "submitting";

  async function handleApprove() {
    if (!token) return;
    setActionState("submitting");
    try {
      await submitOrderItemProofDecision(orderId, itemId, "approved", undefined, token);
      setActionState("done_approved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.includes("already been processed") || msg.includes("not in approvable")) {
        setErrorMessage("This proof has already been processed.");
      } else {
        setErrorMessage("Something went wrong. Please try again or contact support.");
      }
      setActionState("error");
    }
  }

  async function handleSubmitRejection() {
    if (!token || !rejectionReason.trim()) return;
    setActionState("submitting");
    try {
      await submitOrderItemProofDecision(orderId, itemId, "rejected", rejectionReason.trim(), token);
      setActionState("done_rejected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.includes("already been processed") || msg.includes("not in approvable")) {
        setErrorMessage("This proof has already been processed.");
      } else {
        setErrorMessage("Something went wrong. Please try again or contact support.");
      }
      setActionState("error");
    }
  }

  return (
    <div className="border-t border-border mx-5 mb-4 pt-3">
      {/* Collapsible trigger */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-brand-orange hover:text-brand-orange/80 transition-colors w-full text-left"
      >
        <ChevronDown
          size={16}
          className={cn(
            "transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
        Review Proof v{proof.version}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* File preview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
              <p className="font-heading font-semibold text-xs">Artwork File</p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-[11px] font-semibold text-primary border border-primary/30 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors"
              >
                Download
              </a>
            </div>
            <div className="p-3">
              {isPdf ? (
                <iframe
                  src={proofUrl}
                  className="w-full h-[400px] rounded-lg border border-border"
                  title="Artwork proof PDF"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={proofUrl}
                  alt="Artwork proof"
                  className="max-w-full rounded-lg border border-border"
                />
              )}
            </div>
          </div>

          {/* Done: approved */}
          {actionState === "done_approved" && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-success">Artwork Approved</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thank you! Your artwork is approved. We&apos;ll start printing shortly.
                </p>
              </div>
            </div>
          )}

          {/* Done: revision requested */}
          {actionState === "done_rejected" && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <RefreshCw size={18} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Revision Requested</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We&apos;ve received your feedback. Our team will upload a revised proof soon.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {actionState === "error" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <XCircle size={16} className="text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
                {!errorMessage.includes("already") && (
                  <button
                    type="button"
                    onClick={() => { setActionState("idle"); setErrorMessage(""); }}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action panel: idle or rejecting */}
          {(actionState === "idle" || actionState === "rejecting" || actionState === "submitting") && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Please review the artwork proof carefully before making a decision.
              </p>

              {actionState !== "rejecting" && (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionState("rejecting")}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 h-10 rounded-xl border border-border text-sm font-semibold",
                      "hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                  >
                    Request Revision
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-sm font-bold",
                      "bg-brand-orange text-brand-orange-foreground",
                      "hover:bg-brand-orange/90 transition-colors",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {isSubmitting ? "Approving…" : "Approve Artwork"}
                  </button>
                </div>
              )}

              {actionState === "rejecting" && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor={`rejection-reason-${itemId}`}
                      className="block text-xs font-medium mb-1.5"
                    >
                      What needs to be changed?
                    </label>
                    <textarea
                      id={`rejection-reason-${itemId}`}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Describe what you'd like us to fix or change in the artwork…"
                      rows={3}
                      className={cn(
                        "w-full rounded-xl border border-input bg-background px-3 py-2",
                        "text-sm placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        "resize-none"
                      )}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setActionState("idle"); setRejectionReason(""); }}
                      disabled={isSubmitting}
                      className={cn(
                        "flex-1 h-10 rounded-xl border border-border text-sm font-semibold",
                        "hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitRejection}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-sm font-bold",
                        "bg-destructive text-white",
                        "hover:bg-destructive/90 transition-colors",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={14} className="animate-spin" /> Submitting…</>
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
      )}
    </div>
  );
}
