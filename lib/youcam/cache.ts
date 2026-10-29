import { DURABLE_TTL, durableGetBytes, durableGetJson, durableSetBytes, durableSetJson } from "@/lib/store/durable";
import type { ChainStep } from "@/lib/look/chain";

export type CachedStep = {
  imageUrl: string;
  dstId?: string;
  cachedAt: number;
};

function stepKey(key: string): string {
  return `cache:step:${key}`;
}

function frameKey(key: string): string {
  return `cache:frame:${key}`;
}

export async function getCachedStep(key: string): Promise<CachedStep | undefined> {
  const hit = await durableGetJson<CachedStep>(stepKey(key));
  if (!hit) return undefined;
  if (Date.now() - hit.cachedAt > DURABLE_TTL.cache * 1000) {
    return undefined;
  }
  return hit;
}

export async function setCachedStep(
  key: string,
  value: Omit<CachedStep, "cachedAt">,
): Promise<void> {
  await durableSetJson(
    stepKey(key),
    { ...value, cachedAt: Date.now() },
    DURABLE_TTL.cache,
  );
}

export async function getCachedFrame(key: string): Promise<Buffer | undefined> {
  return durableGetBytes(frameKey(key));
}

export async function setCachedFrame(key: string, bytes: Buffer): Promise<void> {
  await durableSetBytes(frameKey(key), bytes, DURABLE_TTL.cache);
}

export function describeCacheHit(step: ChainStep, key: string): string {
  return `cache hit ${step} ${key.slice(0, 8)}`;
}
