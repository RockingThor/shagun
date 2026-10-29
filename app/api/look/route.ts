import { OCCASIONS, type Occasion } from "@/data/catalog";
import {
  CHAIN_STEPS,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import { createLookJob, getUpload, serializeJob } from "@/lib/look/jobs";
import type { PriorHint } from "@/lib/look/prior";
import { isSamplePhoto } from "@/lib/look/sample";
import { clientIp, consumeLiveLookSlot } from "@/lib/youcam/rate-limit";
import { youcamConfig } from "@/lib/youcam/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isOccasion(value: unknown): value is Occasion {
  return (
    typeof value === "string" &&
    (OCCASIONS as readonly string[]).includes(value)
  );
}

function isStep(value: unknown): value is ChainStep {
  return (
    typeof value === "string" &&
    (CHAIN_STEPS as readonly string[]).includes(value)
  );
}

function isLookIds(value: unknown): value is LookIds {
  if (!value || typeof value !== "object") return false;
  const look = value as LookIds;
  return Boolean(
    look.outfitId && look.earringId && look.hairId && look.lipId,
  );
}

function isPriorSteps(value: unknown): value is PriorHint[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as PriorHint).id === "string",
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    imageHash?: string;
    occasion?: string;
    budget?: number;
    look?: LookIds;
    fromStep?: ChainStep;
    selfiePreviewUrl?: string;
    priorSteps?: PriorHint[];
  };

  if (!body.imageHash) {
    return Response.json({ error: "Upload a selfie first." }, { status: 400 });
  }
  if (!isOccasion(body.occasion)) {
    return Response.json({ error: "Pick an occasion." }, { status: 400 });
  }
  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    return Response.json({ error: "Set a rupee budget." }, { status: 400 });
  }
  if (body.look && !isLookIds(body.look)) {
    return Response.json({ error: "Look is incomplete." }, { status: 400 });
  }
  if (body.fromStep && !isStep(body.fromStep)) {
    return Response.json({ error: "Unknown render step." }, { status: 400 });
  }
  if (body.priorSteps && !isPriorSteps(body.priorSteps)) {
    return Response.json({ error: "Prior steps are invalid." }, { status: 400 });
  }

  const config = youcamConfig();
  const sample = isSamplePhoto(body.imageHash);
  if (!config.demoMode && !sample) {
    const upload = await getUpload(body.imageHash);
    if (!upload) {
      return Response.json(
        { error: "Upload a selfie first.", offerSample: true },
        { status: 400 },
      );
    }
    const slot = await consumeLiveLookSlot(clientIp(request.headers));
    if (!slot.allowed) {
      return Response.json(
        {
          error: slot.message,
          code: slot.code,
          offerSample: true,
          samplePhotoHash: slot.samplePhotoHash,
          limit: slot.limit,
          remaining: 0,
        },
        { status: 429 },
      );
    }
  }

  const job = await createLookJob({
    imageHash: body.imageHash,
    occasion: body.occasion,
    budget,
    look: body.look,
    fromStep: body.fromStep,
    selfiePreviewUrl: body.selfiePreviewUrl,
    priorSteps: body.priorSteps,
  });

  return Response.json(serializeJob(job));
}
