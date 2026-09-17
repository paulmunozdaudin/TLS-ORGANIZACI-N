"use client";

import { useEffect, useState } from "react";

export interface Countdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function useCountdown(target: Date | null): Countdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;

  const totalMs = target.getTime() - now;
  const isPast = totalMs <= 0;
  const abs = Math.abs(totalMs);

  return {
    totalMs,
    isPast,
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((abs / (1000 * 60)) % 60),
    seconds: Math.floor((abs / 1000) % 60),
  };
}
