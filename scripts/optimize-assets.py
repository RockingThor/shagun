#!/usr/bin/env python3
"""Copy live YouCam assets into public/ as progressive JPEGs."""

from pathlib import Path
from PIL import Image

SRC = Path("/tmp/shagun-assets")
ROOT = Path("/workspace/public")

STEPS = {
    "1-clothes": "clothes",
    "2-hair": "hair",
    "3-earrings": "earrings",
    "4-lipstick": "lipstick",
}


def save_jpeg(src: Path, dst: Path, max_side: int, quality: int) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    longest = max(w, h)
    if longest > max_side:
        scale = max_side / longest
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"{dst.relative_to(ROOT)}  {im.size}  {dst.stat().st_size // 1024}KB")


def main() -> None:
    for name in ("marigold-anarkali", "banarasi-lehenga", "ivory-cape", "navy-coord"):
        save_jpeg(SRC / "outfits" / f"{name}.jpg", ROOT / "catalog" / f"{name}.jpg", 960, 85)
    for name in ("kundan-chandbali", "temple-jhumkas", "pearl-drops", "gold-hoops"):
        save_jpeg(SRC / "earrings" / f"{name}.jpg", ROOT / "catalog" / f"{name}.jpg", 800, 85)
    for name in ("gajra-waves", "bridal-bun", "sleek-part", "side-sweep"):
        save_jpeg(SRC / "hair" / f"{name}.jpg", ROOT / "catalog" / f"{name}.jpg", 512, 85)

    save_jpeg(SRC / "selfies" / "selfie-1.jpg", ROOT / "demo" / "selfie.jpg", 1024, 84)

    occasions = ("diwali", "sangeet", "office-party", "wedding-guest")
    for occ in occasions:
        for suffix, step in STEPS.items():
            save_jpeg(
                SRC / "renders" / f"{occ}-{suffix}.jpg",
                ROOT / "demo" / "looks" / f"{occ}-{step}.jpg",
                1024,
                84,
            )
        save_jpeg(
            SRC / "renders" / f"final-{occ}.jpg",
            ROOT / "demo" / "finals" / f"{occ}.jpg",
            1024,
            84,
        )
    save_jpeg(
        SRC / "renders" / "contact-sheet-finals.jpg",
        ROOT / "demo" / "contact-sheet.jpg",
        1600,
        82,
    )


if __name__ == "__main__":
    main()
