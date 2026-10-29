"use client";

import { ModeBadge } from "@/components/mode-badge";
import { readCart } from "@/lib/cart";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readCart().length);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("shagun-cart", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("shagun-cart", sync);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-wide text-maroon">
            Shagun
          </span>
          <span className="hidden text-xs uppercase tracking-[0.22em] text-saffron sm:inline">
            Occasion looks
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <ModeBadge />
          <Link href="/style" className="text-ink/80 hover:text-maroon">
            Style
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-maroon hover:bg-gold-soft/30"
          >
            <ShoppingBag className="size-4" />
            Cart
            <span className="tabular-nums">{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
