"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/useMounted";

interface AnnouncementCountdownProps {
  targetIso: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRemaining(ms: number): string | null {
  if (ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
  }
  return `${hours}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

export function AnnouncementCountdown({ targetIso }: AnnouncementCountdownProps) {
  const mounted = useMounted();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(targetIso).getTime();

    const tick = () => setRemainingMs(target - Date.now());
    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [targetIso]);

  if (!mounted || remainingMs === null) return null;

  const formatted = formatRemaining(remainingMs);
  if (!formatted) return null;

  return <span className="whitespace-nowrap font-semibold tabular-nums">{formatted}</span>;
}
