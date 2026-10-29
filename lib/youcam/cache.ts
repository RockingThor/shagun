import type { ChainStep } from "@/lib/look/chain";

export type CachedStep = {
  imageUrl: string;
  dstId?: string;
  cachedAt: number;
};

type Memory = {
  steps: Map<string, CachedStep>;
};

const globalForCache = globalThis as typeof globalThis & {
  __shagunYouCamCache?: Memory;
};

const memory: Memory =
  globalForCache.__shagunYouCamCache ??
  (globalForCache.__shagunYouCamCache = { steps: new Map() });

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function getCachedStep(key: string): CachedStep | undefined {
  const hit = memory.steps.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.cachedAt > TWO_HOURS_MS) {
    memory.steps.delete(key);
    return undefined;
  }
  return hit;
}

export function setCachedStep(key: string, value: Omit<CachedStep, "cachedAt">) {
  memory.steps.set(key, { ...value, cachedAt: Date.now() });
}

export function cacheSize(): number {
  return memory.steps.size;
}

export function describeCacheHit(step: ChainStep, key: string): string {
  return `cache hit ${step} ${key.slice(0, 8)}`;
}
