import type { ServiceabilityResult } from "@/types";
import { delay } from "./delay";
import { apiFetch } from "./client";

// ─── Backend response shape ───────────────────────────────────────────────────

interface BackendServiceability {
  pincode: string;
  is_serviceable: boolean;
  estimated_delivery_date: string | null;
  min_days: number | null;
  max_days: number | null;
}

function mapServiceability(d: BackendServiceability): ServiceabilityResult {
  return {
    pincode: d.pincode,
    isServiceable: d.is_serviceable,
    estimatedDeliveryDate: d.estimated_delivery_date,
    minDays: d.min_days,
    maxDays: d.max_days,
  };
}

// ─── API function ─────────────────────────────────────────────────────────────

// Errors (network failure, 429 rate-limit) are deliberately left to propagate —
// the backend always returns 200 with is_serviceable true/false, so a caller
// needs to tell "not serviceable" apart from "couldn't check right now".
export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  // REAL API: GET /shipping/serviceability?pincode=XXXXXX
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(500);
    if (pincode.endsWith("0")) {
      return { pincode, isServiceable: false, estimatedDeliveryDate: null, minDays: null, maxDays: null };
    }
    const eta = new Date();
    eta.setDate(eta.getDate() + 5);
    return {
      pincode,
      isServiceable: true,
      estimatedDeliveryDate: eta.toISOString().slice(0, 10),
      minDays: 3,
      maxDays: 7,
    };
  }

  const data = await apiFetch<BackendServiceability>(`/shipping/serviceability?pincode=${pincode}`);
  return mapServiceability(data);
}
