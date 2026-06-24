"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Ticking countdown in seconds. Call the returned setter to (re)start it —
 * e.g. setSeconds(30) after sending an OTP to gate the "Resend" action.
 */
export function useCountdown(): [number, Dispatch<SetStateAction<number>>] {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return [seconds, setSeconds];
}
