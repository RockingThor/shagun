import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalog, type Occasion } from "../data/catalog";
import { catalogCardSvg, portraitSvg } from "../lib/demo-portrait";
import { pickLook } from "../lib/look/picker";
import { CHAIN_STEPS } from "../lib/look/chain";

const root = path.join(process.cwd(), "public");

function write(rel: string, contents: string) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

write(
  "catalog/README.txt",
  `Replace each SVG with a real product photo (JPG or PNG) of the same filename stem.

YouCam live mode cannot use these SVG cards as garment / earring / hair references.

Needed:
${catalog.map((item) => `- public${item.image}  →  ${item.name} (${item.category})`).join("\n")}
`,
);

for (const item of catalog) {
  write(item.image.replace(/^\//, ""), catalogCardSvg(item));
}

const sampleLook = {
  outfitId: "ivory-cape",
  earringId: "pearl-drops",
  hairId: "sleek-part",
  lipId: "marigold-nude",
};

write(
  "demo/selfie.svg",
  portraitSvg({ look: sampleLook, step: "selfie", caption: "Sample selfie" }),
);

const occasions: Occasion[] = [
  "diwali",
  "sangeet",
  "office-party",
  "wedding-guest",
];

for (const occasion of occasions) {
  const look = pickLook(catalog, occasion, 16000);
  for (const step of CHAIN_STEPS) {
    write(
      `demo/looks/${occasion}-${step}.svg`,
      portraitSvg({ look: look.ids, step }),
    );
  }
}

write(
  "demo/README.txt",
  `Demo-mode result images.

Now: illustrated SVG portraits generated from the catalog. They never 404.

Replace later with real YouCam renders (JPG/PNG), same paths:

- public/demo/selfie.svg
  A real chest-up selfie (shoulders visible, frontal face, even light).

- public/demo/looks/{occasion}-{clothes|earrings|hair|lipstick}.svg
  Real chained renders for the default look of each occasion.

Any swapped combination is served live by GET /api/demo/portrait
and should be replaced with cached YouCam PNGs once a key exists.

Filenames currently in public/demo/looks:
${occasions
  .flatMap((occasion) =>
    CHAIN_STEPS.map((step) => `- ${occasion}-${step}.svg`),
  )
  .join("\n")}
`,
);

console.log(`Wrote ${catalog.length} catalog cards and demo portraits.`);
