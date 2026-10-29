# Shagun

An Indian occasion-styling store for the Devpost **YouCam API Skin AI & eCommerce VTO Hackathon**.

Upload a chest-up selfie, pick Diwali, a sangeet, an office party or a wedding guest look, and a rupee budget. Shagun picks an outfit, a hairstyle, earrings and a lip shade, then **chains four YouCam tasks** onto the same face:

1. Clothes VTO (`cloth-v4`, 2 units)
2. Hairstyle transfer (`hair-transfer` v2.1, 2 units)
3. Earrings 2D VTO (`2d-vto/earring`, 1 unit)
4. Makeup VTO lipstick (`makeup-vto`, 1 unit)

Hair must run **before** earrings. Hair-transfer redraws the head and erases jewellery if the order is reversed. Loose hair over the ears fails earrings with `earlobe alignment not confident` (not charged); the live path skips that step and suggests an updo.

Each successful result is re-encoded to JPEG (max side 1024) and re-uploaded so the next task always gets a JPG. Swapping one item re-renders from that step onward. Adding the look puts all four SKUs in the cart.

**6 units per full look.** A lipstick swap costs 1; an earring swap costs 2; a hair swap costs 4.

## Setup

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `YOUCAM_API_KEY` | unset | Server-only Bearer token. Never sent to the browser. |
| `YOUCAM_API_BASE` | `https://yce-api-01.makeupar.com` | India-region host. |
| `DEMO_MODE` | `true` when no key | Real captured renders, zero units. Set `false` to go live. |
| `YOUCAM_DAILY_IP_CAP` | `8` | Live-mode look starts per client IP per UTC day. |
| `YOUCAM_POLL_HINT_MS` | `3000` | YouCam poll interval used in docs. |
| Feature paths | see `.env.example` | File, cloth-v4, hair-transfer v2.1, 2d-vto/earring, makeup-vto. |
| `YOUCAM_LIP_SHAPE` | `original` | Lipstick shape label. |
| `YOUCAM_HAIR_TEMPLATE_*` | catalog defaults | Override `template_id`s. |

Auth is `Authorization: Bearer <YOUCAM_API_KEY>`.

## Demo mode

Default until a key is set. Each occasion uses the captured YouCam chain:

| Occasion | Outfit | Hair (`template_id`) | Earrings | Lips |
|---|---|---|---|---|
| Diwali | Marigold Anarkali | side-sweep → `female_boho_side_braid` | Temple Jhumkas | Sindoor Rose `#B4233A` matte |
| Sangeet | Navy Sequin Co-ord | Gajra Bun → `female_messy_bun` | Kundan Chandbali | Festive Coral `#E05A4F` gloss |
| Office party | Ivory Cape Kurta | sleek-part → `female_sleek_middle_part` | Gold Hoops | Marigold Nude `#C4785A` matte |
| Wedding guest | Banarasi Wine Lehenga | bridal-bun → `female_casual_updo` | Pearl Drops | Berry Wine `#6B1D32` gloss |

Sample selfie: `public/demo/selfie.jpg` (768×1024). Step frames: `public/demo/looks/{occasion}-{clothes,hair,earrings,lipstick}.jpg`.

## Live payloads

Clothes: `{ src_file_id, ref_file_id, garment_category: "upper_body" }`

Hair: `{ src_file_id, template_id }` (input JPG, long side ≤ 1024)

Earrings: `{ src_file_id, ref_file_ids, source_info, object_infos }` — `source_info` and `object_infos[].name` are required or YouCam returns 400.

Lipstick: `{ src_file_id, version: "1.0", effects: [{ category: "lip_color", shape: { name: "original" }, style: { type: "full" }, palettes: [{ color, texture, colorIntensity: 70, …gloss fields }] }] }`

Failed tasks are not charged. Earring PNG outputs are converted to JPEG before the next upload.

## Unit cost per look

| Step | Feature | Units |
|---|---|---|
| Clothes | `/s2s/v2.0/task/cloth-v4` | 2 |
| Hair | `/s2s/v2.1/task/hair-transfer` | 2 |
| Earrings | `/s2s/v2.0/task/2d-vto/earring` | 1 (skipped if lobes are covered) |
| Lipstick | `/s2s/v2.0/task/makeup-vto` | 1 |
| **Full look** | chained | **6** |

## Assets

Catalog outfits, earrings and hairstyles are real JPG product / template photos. Lip shades stay hex swatches (`public/catalog/*.svg`).

`python3 scripts/optimize-assets.py` recompresses the live YouCam bundle into `public/`.

MIT licence. Hackathon deadline: **Mon 2 Nov 2026, 10:15 PM IST**.
