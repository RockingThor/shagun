export const SAMPLE_PHOTO_HASH = "demo-selfie";

export function isSamplePhoto(hash?: string | null): boolean {
  return hash === SAMPLE_PHOTO_HASH;
}
