import type { CatalogItem } from "@/data/catalog";
import { hairTemplateOverride } from "@/lib/youcam/config";
import type { ImageSource } from "@/lib/youcam/types";

export function sourceFields(source: ImageSource): Record<string, string> {
  if (source.fileId) return { src_file_id: source.fileId };
  if (source.url) return { src_file_url: source.url };
  throw new Error("YouCam task is missing src_file_id and src_file_url");
}

export function clothesPayload(
  source: ImageSource,
  ref: ImageSource,
  garmentCategory = "upper_body",
): Record<string, unknown> {
  const refFields = ref.fileId
    ? { ref_file_id: ref.fileId }
    : { ref_file_url: ref.url };
  return {
    ...sourceFields(source),
    ...refFields,
    garment_category: garmentCategory,
  };
}

export function hairPayload(
  source: ImageSource,
  templateId: string,
): Record<string, unknown> {
  return {
    ...sourceFields(source),
    template_id: templateId,
  };
}

export function earringPayload(
  source: ImageSource,
  ref: ImageSource,
): Record<string, unknown> {
  const refIds = ref.fileId ? [ref.fileId] : undefined;
  const refUrls = ref.url && !ref.fileId ? [ref.url] : undefined;
  return {
    ...sourceFields(source),
    ...(refIds ? { ref_file_ids: refIds } : { ref_file_urls: refUrls }),
    source_info: { name: "selfie.jpg" },
    object_infos: [
      {
        name: "earring.jpg",
        parameter: {
          earring_need_remove_background: true,
          earring_occluded_type: 0,
          earring_shadow_intensity: 0.3,
          earring_ambient_light_intensity: 0.8,
        },
      },
    ],
  };
}

export function lipstickPayload(
  source: ImageSource,
  item: Pick<CatalogItem, "lipHex" | "swatch" | "lipTexture">,
  lipShape = "original",
): Record<string, unknown> {
  const hex = item.lipHex ?? item.swatch;
  const texture = item.lipTexture ?? "matte";
  const palette: Record<string, unknown> = {
    color: hex,
    texture,
    colorIntensity: 70,
  };
  if (texture === "gloss") {
    palette.gloss = 60;
    palette.transparencyIntensity = 30;
  }
  return {
    ...sourceFields(source),
    version: "1.0",
    effects: [
      {
        category: "lip_color",
        shape: { name: lipShape },
        style: { type: "full" },
        palettes: [palette],
      },
    ],
  };
}

export function hairTemplateId(item: CatalogItem): string | undefined {
  return hairTemplateOverride(item.id) ?? item.youcamTemplateId;
}
