import { UNITS_PER_LOOK } from "@/lib/look/chain";
import { youcamConfig } from "@/lib/youcam/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = youcamConfig();
  return Response.json({
    demoMode: config.demoMode,
    unitsPerLook: UNITS_PER_LOOK,
    dailyIpCap: config.dailyIpCap,
    baseHost: new URL(config.baseUrl).host,
  });
}
