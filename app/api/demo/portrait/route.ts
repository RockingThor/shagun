import { portraitSvg } from "@/lib/demo-portrait";
import { CHAIN_STEPS, type ChainStep, type LookIds } from "@/lib/look/chain";

export const dynamic = "force-dynamic";

function asStep(value: string | null): ChainStep | "selfie" {
  if (value === "selfie") return "selfie";
  if (value && (CHAIN_STEPS as readonly string[]).includes(value)) {
    return value as ChainStep;
  }
  return "lipstick";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const look: LookIds = {
    outfitId: url.searchParams.get("outfit") ?? "marigold-anarkali",
    earringId: url.searchParams.get("earrings") ?? "temple-jhumkas",
    hairId: url.searchParams.get("hair") ?? "gajra-waves",
    lipId: url.searchParams.get("lip") ?? "sindoor-rose",
  };
  const step = asStep(url.searchParams.get("step"));
  try {
    const svg = portraitSvg({ look, step });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";
    return new Response(message, { status: 400 });
  }
}
