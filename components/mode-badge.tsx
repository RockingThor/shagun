"use client";

import { Badge } from "@/components/ui/badge";
import { useRuntimeStatus } from "@/components/runtime-status";

export function ModeBadge({
  liveLabel = "Live YouCam",
  demoLabel = "Demo mode",
}: {
  liveLabel?: string;
  demoLabel?: string;
}) {
  const status = useRuntimeStatus();
  if (status?.demoMode === true) return <Badge>{demoLabel}</Badge>;
  if (status?.demoMode === false) return <Badge>{liveLabel}</Badge>;
  return <Badge>Occasion looks</Badge>;
}
