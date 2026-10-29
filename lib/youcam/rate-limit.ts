import { SAMPLE_PHOTO_HASH } from "@/lib/look/sample";
import { DURABLE_TTL, durableGetJson, durableSetJson } from "@/lib/store/durable";
import { youcamConfig } from "@/lib/youcam/config";

type Bucket = { day: string; count: number };

export type LiveCapCode = "global_cap" | "ip_cap";

export type LiveCapResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  code?: LiveCapCode;
  offerSample: boolean;
  samplePhotoHash: string;
  message: string | null;
};

export function todayUtc(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function clientIp(headers: Headers): string {
  const nf = headers.get("x-nf-client-connection-ip")?.trim();
  if (nf) return nf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "local";
}

export function liveCapMessage(kind: LiveCapCode, limit: number): string {
  if (kind === "global_cap") {
    return `Today's ${limit} live looks are paused so the YouCam balance lasts through judging. Try the sample photo — it uses the captured chain and spends no units.`;
  }
  return `This device has used today's ${limit} live looks. Try the sample photo — captured renders, zero units.`;
}

function globalKey(day: string): string {
  return `cap:global:${day}`;
}

function ipKey(day: string, ip: string): string {
  return `cap:ip:${day}:${encodeURIComponent(ip)}`;
}

async function readBucket(key: string, day: string): Promise<Bucket> {
  const stored = await durableGetJson<Bucket>(key);
  if (stored && stored.day === day && Number.isFinite(stored.count)) {
    return stored;
  }
  return { day, count: 0 };
}

async function writeBucket(key: string, bucket: Bucket): Promise<void> {
  await durableSetJson(key, bucket, DURABLE_TTL.cap);
}

export async function liveCapSnapshot(ip: string): Promise<{
  day: string;
  globalLimit: number;
  ipLimit: number;
  globalUsed: number;
  ipUsed: number;
  globalRemaining: number;
  ipRemaining: number;
}> {
  const config = youcamConfig();
  const day = todayUtc();
  const globalLimit = Math.max(1, config.globalDailyCap);
  const ipLimit = Math.max(1, config.dailyIpCap);
  const global = await readBucket(globalKey(day), day);
  const perIp = await readBucket(ipKey(day, ip), day);
  return {
    day,
    globalLimit,
    ipLimit,
    globalUsed: global.count,
    ipUsed: perIp.count,
    globalRemaining: Math.max(0, globalLimit - global.count),
    ipRemaining: Math.max(0, ipLimit - perIp.count),
  };
}

export async function consumeLiveLookSlot(ip: string): Promise<LiveCapResult> {
  const snapshot = await liveCapSnapshot(ip);
  const sample = {
    offerSample: true as const,
    samplePhotoHash: SAMPLE_PHOTO_HASH,
  };

  if (snapshot.globalUsed >= snapshot.globalLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: snapshot.globalLimit,
      code: "global_cap",
      message: liveCapMessage("global_cap", snapshot.globalLimit),
      ...sample,
    };
  }
  if (snapshot.ipUsed >= snapshot.ipLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: snapshot.ipLimit,
      code: "ip_cap",
      message: liveCapMessage("ip_cap", snapshot.ipLimit),
      ...sample,
    };
  }

  const day = snapshot.day;
  const global = await readBucket(globalKey(day), day);
  global.count += 1;
  await writeBucket(globalKey(day), global);

  const perIp = await readBucket(ipKey(day, ip), day);
  perIp.count += 1;
  await writeBucket(ipKey(day, ip), perIp);

  return {
    allowed: true,
    remaining: Math.min(
      snapshot.globalLimit - global.count,
      snapshot.ipLimit - perIp.count,
    ),
    limit: snapshot.globalLimit,
    offerSample: false,
    samplePhotoHash: SAMPLE_PHOTO_HASH,
    message: null,
  };
}
