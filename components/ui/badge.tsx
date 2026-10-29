import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-gold/50 bg-gold-soft/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon",
        className,
      )}
      {...props}
    />
  );
}
