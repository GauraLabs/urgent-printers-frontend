"use client";

import { useCallback, useEffect, useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import {
  clearConsentStatus,
  getConsentStatus,
  setConsentStatus,
  type ConsentStatus,
} from "@/lib/consent";

interface UseConsentResult {
  /** Always "undecided" until mount, matching SSR output — see useMounted. */
  status: ConsentStatus;
  accept: () => void;
  reject: () => void;
  /** Clears the stored choice so the banner can reappear (Manage preferences). */
  reset: () => void;
}

export function useConsent(): UseConsentResult {
  const mounted = useMounted();
  const [status, setStatus] = useState<ConsentStatus>("undecided");

  useEffect(() => {
    if (mounted) setStatus(getConsentStatus());
  }, [mounted]);

  const accept = useCallback(() => {
    setConsentStatus("accepted");
    setStatus("accepted");
  }, []);

  const reject = useCallback(() => {
    setConsentStatus("rejected");
    setStatus("rejected");
  }, []);

  const reset = useCallback(() => {
    clearConsentStatus();
    setStatus("undecided");
  }, []);

  return { status: mounted ? status : "undecided", accept, reject, reset };
}
