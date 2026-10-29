# Shagun

An Indian occasion-styling store for the Devpost **YouCam API Skin AI & eCommerce VTO Hackathon**.

Upload a chest-up selfie, pick Diwali, a sangeet, an office party or a wedding guest look, and a rupee budget. Shagun picks an outfit, earrings, a hairstyle and a lip shade from a 16-item catalog, then **chains four YouCam tasks** onto the same face:

1. Clothes VTO (`cloth-v4`, 2 units)
2. Earrings 2D VTO (`2d-vto/earring`, 1 unit)
3. Hairstyle transfer (`hair-transfer` v2.1, 2 units)
4. Makeup VTO lipstick (`makeup-vto`, 1 unit)

Each step’s result (`dst_id` when present, otherwise the result URL) is the next step’s source. Swapping one item re-renders **only from that step onward**. Adding the look puts all four SKUs in the cart, priced against the budget.

**6 units per full look.** A lipstick swap costs 1; an earring swap costs 4.

## Setup

```bash
npm install
cp .env.example .env.local
npm run generate:placeholders
npm test
npm run dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `YOUCAM_API_KEY` | unset | Server-only Bearer token. Never sent to the browser. |
| `YOUCAM_API_BASE` | `https://yce-api-01.makeupar.com` | India-region host from the YouCam docs. |
| `DEMO_MODE` | `true` when no key | Complete flow with illustrated results, zero units. |
| `YOUCAM_DAILY_IP_CAP` | `8` | Live-mode look starts per client IP per UTC day. |
| `YOUCAM_FILE_PATH` | `/s2s/v2.0/file` | File API. |
| `YOUCAM_CLOTHES_PATH` | `/s2s/v2.0/task/cloth-v4` | Clothes VTO. |
| `YOUCAM_EARRING_PATH` | `/s2s/v2.0/task/2d-vto/earring` | Earrings 2D VTO. |
| `YOUCAM_HAIR_PATH` | `/s2s/v2.1/task/hair-transfer` | Hairstyle V2.1. Treat as configurable. |
| `YOUCAM_MAKEUP_PATH` | `/s2s/v2.0/task/makeup-vto` | Makeup VTO. |
| `YOUCAM_LIP_SHAPE` | `original` | Lipstick shape label from `lipshape.json`. |
| `YOUCAM_HAIR_TEMPLATE_*` | unset | Optional hair-transfer `template_id`s. If unset, live mode uploads the hairstyle catalog **JPG/PNG**. |

Auth is `Authorization: Bearer <YOUCAM_API_KEY>`.

## Demo mode

Demo is the default until a key is set. It still:

- picks a look inside the budget
- walks clothes → earrings → hair → lipstick with progress
- swaps from the changed step onward
- adds the itemised look to the cart

Results are illustrated SVG portraits from `public/demo/` plus `GET /api/demo/portrait`. No YouCam units are spent.

## Live path (code-complete, not run here)

The browser never talks to YouCam. Route Handlers own the key.

1. `POST /api/upload` stores the selfie and hashes it.
2. `POST /api/look` rate-limits the IP, picks or accepts a look, uploads files, creates the first task, returns a `jobId`.
3. The browser polls `GET /api/look/:jobId`. Each poll checks the current YouCam task (~2 s). On success it starts the next feature using `dst_id` or the result URL. Requests stay short.
4. Step results are cached by `sha256(imageHash + items through this step)` for two hours (YouCam result URLs expire).

Polling is mandatory per the docs; a created task that is never polled still times out and can spend units. This app polls until `task_status` is `success` or `error`.

Live catalog references must be **JPG or PNG**. The SVG cards in `public/catalog/` are placeholders and will be rejected with a clear error.

## Unit cost per look

| Step | Feature | Units |
|---|---|---|
| Clothes | `/s2s/v2.0/task/cloth-v4` | 2 |
| Earrings | `/s2s/v2.0/task/2d-vto/earring` | 1 |
| Hair | `/s2s/v2.1/task/hair-transfer` | 2 |
| Lipstick | `/s2s/v2.0/task/makeup-vto` | 1 |
| **Full look** | chained | **6** |

Units are charged by YouCam only on success. The in-app counter tracks planned vs used units, including skipped work from cache or a partial re-render.

## Images still needed

Tasteful SVG placeholders ship so nothing is empty or broken. Replace them with real photos (keep the same filenames) before a live demo:

**Catalog (product photos YouCam can use as `ref_file`):**

- `public/catalog/marigold-anarkali.svg` → JPG/PNG of the anarkali
- `public/catalog/banarasi-lehenga.svg`
- `public/catalog/ivory-cape.svg`
- `public/catalog/navy-coord.svg`
- `public/catalog/kundan-chandbali.svg` — single-earring product shot
- `public/catalog/temple-jhumkas.svg`
- `public/catalog/pearl-drops.svg`
- `public/catalog/gold-hoops.svg`
- `public/catalog/gajra-waves.svg` — hair reference selfie, or set `YOUCAM_HAIR_TEMPLATE_GAJRA_WAVES`
- `public/catalog/bridal-bun.svg`
- `public/catalog/sleek-part.svg`
- `public/catalog/side-sweep.svg`
- `public/catalog/sindoor-rose.svg` — lipstick still (hex is already in the catalog)
- `public/catalog/berry-wine.svg`
- `public/catalog/marigold-nude.svg`
- `public/catalog/festive-coral.svg`

**Demo renders (optional once a key exists; the SVG portraits remain a fallback):**

- `public/demo/selfie.svg` — a real chest-up selfie (shoulders visible)
- `public/demo/looks/{diwali,sangeet,office-party,wedding-guest}-{clothes,earrings,hair,lipstick}.svg`

Selfie requirements from the YouCam notes: JPG/PNG, under 10 MB, single person, chest-up with shoulders, frontal face.

## Scripts

- `npm run dev` — http://127.0.0.1:43127
- `npm test` — picker, chain / partial re-render, cache key
- `npm run build`
- `npm run generate:placeholders` — rewrite SVG catalog and demo art

MIT licence. Hackathon deadline: **Mon 2 Nov 2026, 10:15 PM IST**.
