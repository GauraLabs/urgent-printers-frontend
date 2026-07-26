// Shared logging for lib/api/* catch blocks that fall back to a default value
// instead of throwing. Without this, a real backend outage and "genuinely no
// data" are indistinguishable in the UI — this makes the failure visible in
// logs while preserving the existing swallow-and-default behavior.
// console.error for now; swap the implementation for real telemetry later —
// call sites never change.
export function logApiError(context: string, err: unknown): void {
  console.error(`[lib/api] ${context}:`, err);
}
