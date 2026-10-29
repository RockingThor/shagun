"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";

const FALLBACK = "/demo/selfie.jpg";

export function SafeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const current = failedSrc === src || !src ? FALLBACK : src;

  return (
    // Catalog and demo renders are SVG placeholders until real photos land.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={cn("bg-cream-deep object-cover", className)}
      onError={() => {
        if (src && src !== FALLBACK) setFailedSrc(src);
      }}
    />
  );
}
