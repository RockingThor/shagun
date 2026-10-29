export const OCCASIONS = [
  "diwali",
  "sangeet",
  "office-party",
  "wedding-guest",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export const OCCASION_COPY: Record<
  Occasion,
  { label: string; kicker: string; blurb: string }
> = {
  diwali: {
    label: "Diwali",
    kicker: "Lamps, gold, marigold",
    blurb: "Saffron and maroon silks, temple jewellery, a gajra in the hair.",
  },
  sangeet: {
    label: "Sangeet",
    kicker: "Dance floor, sequins",
    blurb: "Moveable Indo-western sets, statement earrings, a berry lip.",
  },
  "office-party": {
    label: "Office party",
    kicker: "Polished, not costume",
    blurb: "Ivory and navy with quiet gold, a sleek part, a nude-coral mouth.",
  },
  "wedding-guest": {
    label: "Wedding guest",
    kicker: "Festive, not bridal",
    blurb: "A lehenga or cape kurta, pearls or kundan, a soft bun.",
  },
};

export const CATEGORIES = ["outfit", "earrings", "hairstyle", "lip"] as const;
export type Category = (typeof CATEGORIES)[number];

export type PaletteTag =
  | "saffron"
  | "maroon"
  | "gold"
  | "ivory"
  | "navy"
  | "rose"
  | "berry";

export type HairStyleId = "bun" | "waves" | "sleek" | "sideswept";
export type EarringStyleId = "chandbali" | "jhumka" | "pearl" | "hoops";
export type OutfitStyleId = "anarkali" | "lehenga" | "cape" | "coord";
export type GarmentCategory = "upper_body" | "full_body" | "auto";

export type CatalogItem = {
  id: string;
  name: string;
  category: Category;
  priceInr: number;
  occasions: Occasion[];
  image: string;
  description: string;
  palette: PaletteTag[];
  swatch: string;
  accent: string;
  garmentCategory?: GarmentCategory;
  outfitStyle?: OutfitStyleId;
  earringStyle?: EarringStyleId;
  hairStyle?: HairStyleId;
  youcamTemplateId?: string;
  lipHex?: string;
  lipTexture?: "matte" | "gloss";
};

export const catalog: CatalogItem[] = [
  {
    id: "marigold-anarkali",
    name: "Marigold Anarkali",
    category: "outfit",
    priceInr: 4990,
    occasions: ["diwali", "sangeet"],
    image: "/catalog/marigold-anarkali.svg",
    description: "Saffron georgette with a gold-thread yoke. Chest-up VTO as upper body.",
    palette: ["saffron", "gold"],
    swatch: "#D97706",
    accent: "#F5D76E",
    garmentCategory: "upper_body",
    outfitStyle: "anarkali",
  },
  {
    id: "banarasi-lehenga",
    name: "Banarasi Wine Lehenga",
    category: "outfit",
    priceInr: 8990,
    occasions: ["wedding-guest", "diwali"],
    image: "/catalog/banarasi-lehenga.svg",
    description: "Maroon Banarasi blouse with zari border. Rendered from a chest-up selfie.",
    palette: ["maroon", "gold"],
    swatch: "#7A1F2B",
    accent: "#E8C547",
    garmentCategory: "upper_body",
    outfitStyle: "lehenga",
  },
  {
    id: "ivory-cape",
    name: "Ivory Cape Kurta",
    category: "outfit",
    priceInr: 4490,
    occasions: ["office-party", "wedding-guest"],
    image: "/catalog/ivory-cape.svg",
    description: "Ivory silk kurta with a detachable gold-edge cape.",
    palette: ["ivory", "gold"],
    swatch: "#F3E6C8",
    accent: "#C9A227",
    garmentCategory: "upper_body",
    outfitStyle: "cape",
  },
  {
    id: "navy-coord",
    name: "Navy Sequin Co-ord",
    category: "outfit",
    priceInr: 5490,
    occasions: ["office-party", "sangeet"],
    image: "/catalog/navy-coord.svg",
    description: "Indo-western navy co-ord with sparse gold sequins.",
    palette: ["navy", "gold"],
    swatch: "#1E3A5F",
    accent: "#D4AF37",
    garmentCategory: "upper_body",
    outfitStyle: "coord",
  },
  {
    id: "kundan-chandbali",
    name: "Kundan Chandbali",
    category: "earrings",
    priceInr: 2490,
    occasions: ["diwali", "wedding-guest", "sangeet"],
    image: "/catalog/kundan-chandbali.svg",
    description: "Crescent kundan chandbalis. YouCam 2D earring VTO, product image as ref.",
    palette: ["gold", "maroon"],
    swatch: "#E8C547",
    accent: "#7A1F2B",
    earringStyle: "chandbali",
  },
  {
    id: "temple-jhumkas",
    name: "Temple Jhumkas",
    category: "earrings",
    priceInr: 1690,
    occasions: ["diwali", "sangeet"],
    image: "/catalog/temple-jhumkas.svg",
    description: "Bell jhumkas with a temple-coin drop.",
    palette: ["gold", "saffron"],
    swatch: "#C9A227",
    accent: "#D97706",
    earringStyle: "jhumka",
  },
  {
    id: "pearl-drops",
    name: "Pearl Cluster Drops",
    category: "earrings",
    priceInr: 1290,
    occasions: ["office-party", "wedding-guest"],
    image: "/catalog/pearl-drops.svg",
    description: "Ivory pearl clusters on a thin gold hook.",
    palette: ["ivory", "gold"],
    swatch: "#F7F1E3",
    accent: "#C9A227",
    earringStyle: "pearl",
  },
  {
    id: "gold-hoops",
    name: "Minimal Gold Hoops",
    category: "earrings",
    priceInr: 890,
    occasions: ["office-party", "sangeet"],
    image: "/catalog/gold-hoops.svg",
    description: "Small polished hoops. The quiet option.",
    palette: ["gold"],
    swatch: "#D4AF37",
    accent: "#8A6A12",
    earringStyle: "hoops",
  },
  {
    id: "gajra-waves",
    name: "Gajra Loose Waves",
    category: "hairstyle",
    priceInr: 1490,
    occasions: ["diwali", "sangeet"],
    image: "/catalog/gajra-waves.svg",
    description: "Shoulder waves with a white gajra. Hair-transfer style add-on.",
    palette: ["ivory", "saffron"],
    swatch: "#3B2416",
    accent: "#F7F1E3",
    hairStyle: "waves",
  },
  {
    id: "bridal-bun",
    name: "Soft Bridal Bun",
    category: "hairstyle",
    priceInr: 1990,
    occasions: ["wedding-guest", "sangeet"],
    image: "/catalog/bridal-bun.svg",
    description: "A low, soft bun. Not a bride's trail — a guest's bun.",
    palette: ["maroon", "gold"],
    swatch: "#2A1810",
    accent: "#E8C547",
    hairStyle: "bun",
  },
  {
    id: "sleek-part",
    name: "Sleek Centre Part",
    category: "hairstyle",
    priceInr: 790,
    occasions: ["office-party", "wedding-guest"],
    image: "/catalog/sleek-part.svg",
    description: "Glossy centre part, tucked behind the ears.",
    palette: ["navy", "ivory"],
    swatch: "#1A120C",
    accent: "#F3E6C8",
    hairStyle: "sleek",
  },
  {
    id: "side-sweep",
    name: "Classic Side Sweep",
    category: "hairstyle",
    priceInr: 990,
    occasions: ["office-party", "diwali"],
    image: "/catalog/side-sweep.svg",
    description: "Side part with a deep sweep. Works with both silk and sequins.",
    palette: ["gold", "rose"],
    swatch: "#3B2416",
    accent: "#C4785A",
    hairStyle: "sideswept",
  },
  {
    id: "sindoor-rose",
    name: "Sindoor Rose",
    category: "lip",
    priceInr: 790,
    occasions: ["diwali", "wedding-guest"],
    image: "/catalog/sindoor-rose.svg",
    description: "A ceremonial rose. Makeup VTO lipstick, matte, hex on the mouth.",
    palette: ["rose", "maroon"],
    swatch: "#B4233A",
    accent: "#F3E6C8",
    lipHex: "#B4233A",
    lipTexture: "matte",
  },
  {
    id: "berry-wine",
    name: "Berry Wine",
    category: "lip",
    priceInr: 890,
    occasions: ["sangeet", "wedding-guest"],
    image: "/catalog/berry-wine.svg",
    description: "Deep berry with a gloss finish for evening light.",
    palette: ["berry", "maroon"],
    swatch: "#6B1D32",
    accent: "#E8C547",
    lipHex: "#6B1D32",
    lipTexture: "gloss",
  },
  {
    id: "marigold-nude",
    name: "Marigold Nude",
    category: "lip",
    priceInr: 690,
    occasions: ["office-party", "diwali"],
    image: "/catalog/marigold-nude.svg",
    description: "Warm nude with a saffron undertone.",
    palette: ["saffron", "ivory"],
    swatch: "#C4785A",
    accent: "#F5D76E",
    lipHex: "#C4785A",
    lipTexture: "matte",
  },
  {
    id: "festive-coral",
    name: "Festive Coral",
    category: "lip",
    priceInr: 690,
    occasions: ["sangeet", "office-party"],
    image: "/catalog/festive-coral.svg",
    description: "A coral that reads on camera without eating the outfit.",
    palette: ["rose", "gold"],
    swatch: "#E05A4F",
    accent: "#D4AF37",
    lipHex: "#E05A4F",
    lipTexture: "gloss",
  },
];

export const BUDGET_PRESETS = [7000, 10000, 13000, 16000] as const;
export const BUDGET_MIN = 6000;
export const BUDGET_MAX = 18000;
export const DEFAULT_BUDGET = 10000;

export function itemById(id: string): CatalogItem | undefined {
  return catalog.find((item) => item.id === id);
}

export function itemsInCategory(category: Category): CatalogItem[] {
  return catalog.filter((item) => item.category === category);
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
