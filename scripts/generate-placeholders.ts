import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalog } from "../data/catalog";
import { catalogCardSvg } from "../lib/demo-portrait";

const root = path.join(process.cwd(), "public");

function write(rel: string, contents: string) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

const lips = catalog.filter((item) => item.category === "lip");
for (const item of lips) {
  write(item.image.replace(/^\//, ""), catalogCardSvg(item));
}

write(
  "catalog/README.txt",
  `Product photos for YouCam refs (JPG/PNG). Lip shades stay hex swatches.

Outfits, earrings and hairstyles were generated with the live YouCam API
and live in this folder as .jpg. Lip items remain SVG colour cards:

${lips.map((item) => `- public${item.image}  ${item.name} ${item.lipHex}`).join("\n")}
`,
);

console.log(`Wrote ${lips.length} lip swatches.`);
