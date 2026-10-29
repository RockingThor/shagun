"use client";

import { SafeImage } from "@/components/safe-image";
import { useState } from "react";

export function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [amount, setAmount] = useState(72);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[28px] border border-gold/40 bg-cream-deep">
        <SafeImage
          src={beforeSrc}
          alt={beforeLabel}
          className="aspect-[4/5] w-full"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - amount}% 0 0)` }}
        >
          <SafeImage
            src={afterSrc}
            alt={afterLabel}
            className="h-full w-full object-cover"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold-soft"
          style={{ left: `${amount}%` }}
        />
        <p className="absolute bottom-3 left-3 rounded-full bg-maroon-deep/80 px-3 py-1 text-[11px] uppercase tracking-widest text-ivory">
          {beforeLabel}
        </p>
        <p className="absolute right-3 bottom-3 rounded-full bg-saffron/90 px-3 py-1 text-[11px] uppercase tracking-widest text-ivory">
          {afterLabel}
        </p>
      </div>
      <label className="block text-xs font-medium uppercase tracking-[0.16em] text-maroon">
        Slide to compare
        <input
          type="range"
          min={4}
          max={96}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="mt-2 w-full accent-saffron"
        />
      </label>
    </div>
  );
}
