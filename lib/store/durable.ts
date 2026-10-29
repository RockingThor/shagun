/**
 * Small JSON/bytes store. On Netlify this uses Blobs (free, durable across
 * serverless instances). Locally and in tests it falls back to memory.
 */

const TWO_HOURS_S = 2 * 60 * 60;
const THREE_DAYS_S = 3 * 24 * 60 * 60;

type MemoryEntry = {
  json?: unknown;
  bytes?: Buffer;
  expiresAt?: number;
};

const globalForStore = globalThis as typeof globalThis & {
  __shagunDurable?: Map<string, MemoryEntry>;
};

const memory: Map<string, MemoryEntry> =
  globalForStore.__shagunDurable ??
  (globalForStore.__shagunDurable = new Map());

type BlobStore = {
  get: (
    key: string,
    options?: { type?: string; consistency?: string },
  ) => Promise<unknown>;
  set: (key: string, value: ArrayBuffer | Blob | string) => Promise<unknown>;
  setJSON: (key: string, value: unknown) => Promise<unknown>;
};

let blobsPromise: Promise<BlobStore | null> | null = null;

function blobsConfigured(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.NETLIFY_BLOBS_TOKEN ||
      process.env.NETLIFY_SITE_ID,
  );
}

async function blobsStore(): Promise<BlobStore | null> {
  if (!blobsConfigured()) return null;
  if (!blobsPromise) {
    blobsPromise = import("@netlify/blobs")
      .then(({ getStore }) =>
        getStore({ name: "shagun", consistency: "strong" }) as unknown as BlobStore,
      )
      .catch(() => null);
  }
  return blobsPromise;
}

function stillFresh(entry: MemoryEntry | undefined): entry is MemoryEntry {
  if (!entry) return false;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    return false;
  }
  return true;
}

function remember(
  key: string,
  patch: MemoryEntry,
  ttlSeconds?: number,
): void {
  const expiresAt = ttlSeconds
    ? Date.now() + ttlSeconds * 1000
    : patch.expiresAt;
  const current = memory.get(key) ?? {};
  memory.set(key, { ...current, ...patch, expiresAt });
}

export const DURABLE_TTL = {
  job: TWO_HOURS_S,
  upload: TWO_HOURS_S,
  cache: TWO_HOURS_S,
  cap: THREE_DAYS_S,
  catalog: 6 * 60 * 60,
} as const;

export async function durableGetJson<T>(key: string): Promise<T | undefined> {
  const local = memory.get(key);
  if (stillFresh(local) && local.json !== undefined) {
    return local.json as T;
  }
  if (local && !stillFresh(local)) memory.delete(key);

  const store = await blobsStore();
  if (!store) return undefined;
  try {
    const value = await store.get(key, { type: "json", consistency: "strong" });
    if (value === null || value === undefined) return undefined;
    const envelope = value as { value?: T; expiresAt?: number };
    const payload =
      envelope && typeof envelope === "object" && "value" in envelope
        ? envelope.value
        : (value as T);
    if (envelope?.expiresAt && envelope.expiresAt <= Date.now()) {
      return undefined;
    }
    if (payload === undefined) return undefined;
    remember(key, { json: payload });
    return payload;
  } catch {
    return undefined;
  }
}

export async function durableSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number = DURABLE_TTL.job,
): Promise<void> {
  remember(key, { json: value }, ttlSeconds);
  const store = await blobsStore();
  if (!store) return;
  try {
    await store.setJSON(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  } catch {
    // Local / misconfigured Blobs — memory still holds the value on this instance.
  }
}

export async function durableGetBytes(key: string): Promise<Buffer | undefined> {
  const local = memory.get(key);
  if (stillFresh(local) && local.bytes) return local.bytes;
  if (local && !stillFresh(local)) memory.delete(key);

  const store = await blobsStore();
  if (!store) return undefined;
  try {
    const value = await store.get(key, {
      type: "arrayBuffer",
      consistency: "strong",
    });
    if (!value) return undefined;
    const bytes = Buffer.from(value as ArrayBuffer);
    remember(key, { bytes });
    return bytes;
  } catch {
    return undefined;
  }
}

export async function durableSetBytes(
  key: string,
  bytes: Buffer,
  ttlSeconds: number = DURABLE_TTL.upload,
): Promise<void> {
  remember(key, { bytes }, ttlSeconds);
  const store = await blobsStore();
  if (!store) return;
  try {
    await store.set(key, new Blob([new Uint8Array(bytes)]));
  } catch {
    // Same fallback as JSON writes.
  }
}

export function resetDurableMemoryForTests(): void {
  memory.clear();
  blobsPromise = null;
}
