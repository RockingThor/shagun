import { youcamConfig } from "@/lib/youcam/config";

type Bucket = { day: string; count: number };

const globalForLimit = globalThis as typeof globalThis & {
  __shagunIpCap?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  globalForLimit.__shagunIpCap ??
  (globalForLimit.__shagunIpCap = new Map());

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "local";
}

export function consumeLiveLookSlot(ip: string): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const limit = Math.max(1, youcamConfig().dailyIpCap);
  const day = todayUtc();
  const current = buckets.get(ip);
  const bucket =
    current && current.day === day ? current : { day, count: 0 };
  if (bucket.count >= limit) {
    buckets.set(ip, bucket);
    return { allowed: false, remaining: 0, limit };
  }
  bucket.count += 1;
  buckets.set(ip, bucket);
  return { allowed: true, remaining: limit - bucket.count, limit };
}
