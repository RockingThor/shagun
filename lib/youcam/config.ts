export const YOUCAM_DEFAULT_BASE = "https://yce-api-01.makeupar.com";

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export function youcamConfig() {
  const apiKey = process.env.YOUCAM_API_KEY?.trim() ?? "";
  const demoForced = process.env.DEMO_MODE === "true";
  const demoDenied = process.env.DEMO_MODE === "false";
  const demoMode = demoForced || (!demoDenied && !apiKey);

  return {
    apiKey,
    demoMode,
    baseUrl: env("YOUCAM_API_BASE", YOUCAM_DEFAULT_BASE).replace(/\/$/, ""),
    filePath: env("YOUCAM_FILE_PATH", "/s2s/v2.0/file"),
    clothesPath: env("YOUCAM_CLOTHES_PATH", "/s2s/v2.0/task/cloth-v4"),
    earringPath: env("YOUCAM_EARRING_PATH", "/s2s/v2.0/task/2d-vto/earring"),
    hairPath: env("YOUCAM_HAIR_PATH", "/s2s/v2.1/task/hair-transfer"),
    makeupPath: env("YOUCAM_MAKEUP_PATH", "/s2s/v2.0/task/makeup-vto"),
    lipShape: env("YOUCAM_LIP_SHAPE", "original"),
    dailyIpCap: Number(env("YOUCAM_DAILY_IP_CAP", "8")),
    globalDailyCap: Number(env("YOUCAM_GLOBAL_DAILY_CAP", "25")),
    pollHintMs: Number(env("YOUCAM_POLL_HINT_MS", "3000")),
  };
}

export function hairTemplateOverride(itemId: string): string | undefined {
  const key = `YOUCAM_HAIR_TEMPLATE_${itemId.replace(/-/g, "_").toUpperCase()}`;
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function isDemoMode(): boolean {
  return youcamConfig().demoMode;
}
