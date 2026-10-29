"use client";

import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

const FALLBACK = "/demo/selfie.svg";

export function SafeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || FALLBACK);

  useEffect(() => {
    setCurrent(src || FALLBACK);
  }, [src]);

  return (
    // Catalog and demo renders are SVG placeholders until real photos land.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current || FALLBACK}
      alt={alt}
      className={cn("bg-cream-deep object-cover", className)}
      onError={() => {
        if (current !== FALLBACK) setCurrent(FALLBACK);
      }}
    />
  );
}
