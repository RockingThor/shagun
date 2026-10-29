import { describe, expect, it } from "vitest";
import {
  clothesPayload,
  earringPayload,
  hairPayload,
  lipstickPayload,
} from "@/lib/youcam/payloads";

describe("YouCam payloads", () => {
  it("matches the working cloth-v4 body", () => {
    expect(
      clothesPayload({ fileId: "selfie" }, { fileId: "garment" }, "upper_body"),
    ).toEqual({
      src_file_id: "selfie",
      ref_file_id: "garment",
      garment_category: "upper_body",
    });
  });

  it("matches the working hair-transfer body", () => {
    expect(hairPayload({ fileId: "img" }, "female_boho_side_braid")).toEqual({
      src_file_id: "img",
      template_id: "female_boho_side_braid",
    });
  });

  it("matches the working earring body including source_info", () => {
    expect(earringPayload({ fileId: "img" }, { fileId: "ear" })).toEqual({
      src_file_id: "img",
      ref_file_ids: ["ear"],
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
    });
  });

  it("matches matte and gloss lipstick palettes", () => {
    expect(
      lipstickPayload(
        { fileId: "img" },
        { lipHex: "#B4233A", swatch: "#B4233A", lipTexture: "matte" },
      ),
    ).toEqual({
      src_file_id: "img",
      version: "1.0",
      effects: [
        {
          category: "lip_color",
          shape: { name: "original" },
          style: { type: "full" },
          palettes: [
            { color: "#B4233A", texture: "matte", colorIntensity: 70 },
          ],
        },
      ],
    });
    const gloss = lipstickPayload(
      { fileId: "img" },
      { lipHex: "#6B1D32", swatch: "#6B1D32", lipTexture: "gloss" },
    );
    expect(
      (gloss.effects as Array<{ palettes: Array<Record<string, unknown>> }>)[0]
        .palettes[0],
    ).toEqual({
      color: "#6B1D32",
      texture: "gloss",
      colorIntensity: 70,
      gloss: 60,
      transparencyIntensity: 30,
    });
  });
});
