import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  gold:
    "bg-saffron text-ivory hover:bg-maroon shadow-[0_8px_24px_rgba(196,92,38,0.28)]",
  maroon: "bg-maroon text-ivory hover:bg-maroon-deep",
  outline:
    "border border-gold/70 bg-transparent text-ink hover:bg-gold-soft/20",
  ghost: "text-maroon hover:bg-maroon/8",
};

export function Button({
  className,
  variant = "gold",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
