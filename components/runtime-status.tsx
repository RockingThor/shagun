"use client";

import { useEffect, useState } from "react";

export type RuntimeStatus = {
  demoMode: boolean;
  unitsPerLook: number;
  dailyIpCap: number;
  globalDailyCap: number;
  globalRemaining: number | null;
  ipRemaining: number | null;
  samplePhotoHash: string;
  baseHost: string;
};

let cached: RuntimeStatus | null = null;
let inflight: Promise<RuntimeStatus> | null = null;

async function loadStatus(): Promise<RuntimeStatus> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/status")
      .then((response) => {
        if (!response.ok) throw new Error("status");
        return response.json() as Promise<RuntimeStatus>;
      })
      .then((data) => {
        cached = data;
        return data;
      });
  }
  return inflight;
}

export function useRuntimeStatus(): RuntimeStatus | null {
  const [status, setStatus] = useState<RuntimeStatus | null>(cached);

  useEffect(() => {
    let cancelled = false;
    void loadStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
