import { UNITS_PER_LOOK } from "@/lib/look/chain";
import { SAMPLE_PHOTO_HASH } from "@/lib/look/sample";
import { youcamConfig } from "@/lib/youcam/config";
import { clientIp, liveCapSnapshot } from "@/lib/youcam/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = youcamConfig();
  const caps = config.demoMode
    ? null
    : await liveCapSnapshot(clientIp(request.headers));
  return Response.json({
    demoMode: config.demoMode,
    unitsPerLook: UNITS_PER_LOOK,
    dailyIpCap: config.dailyIpCap,
    globalDailyCap: config.globalDailyCap,
    globalRemaining: caps?.globalRemaining ?? null,
    ipRemaining: caps?.ipRemaining ?? null,
    samplePhotoHash: SAMPLE_PHOTO_HASH,
    baseHost: new URL(config.baseUrl).host,
  });
}
