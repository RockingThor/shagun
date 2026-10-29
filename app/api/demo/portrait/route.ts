import { demoImageFor } from "@/lib/demo-renders";
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
    hairId: url.searchParams.get("hair") ?? "side-sweep",
    lipId: url.searchParams.get("lip") ?? "sindoor-rose",
  };
  const step = asStep(url.searchParams.get("step"));
  const target = demoImageFor(look, step);
  return Response.redirect(new URL(target, url.origin), 302);
}
