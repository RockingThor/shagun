"use client";

import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { OCCASION_COPY, formatInr } from "@/data/catalog";
import { readCart, writeCart, type CartLook } from "@/lib/cart";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CartView() {
  const [looks, setLooks] = useState<CartLook[] | null>(null);

  useEffect(() => {
    setLooks(readCart());
  }, []);

  if (looks === null) {
    return (
      <div className="rounded-[28px] border border-gold/30 bg-white/60 p-8">
        <p className="text-sm text-ink/70">Opening your cart…</p>
      </div>
    );
  }

  if (looks.length === 0) {
    return (
      <div className="rounded-[28px] border border-gold/40 bg-white/70 px-6 py-12 text-center">
        <h2 className="font-display text-3xl text-maroon">No look in the cart yet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/70">
          Generate a Diwali, sangeet, office-party or wedding-guest look and add
          all four pieces in one tap. The cart is empty on purpose, not broken.
        </p>
        <Link
          href="/style"
          className="mt-6 inline-flex rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-ivory"
        >
          Style a look
        </Link>
      </div>
    );
  }

  const grand = looks.reduce((sum, look) => sum + look.total, 0);

  return (
    <div className="space-y-6">
      {looks.map((look) => {
        const over = look.total > look.budget;
        return (
          <article
            key={look.id}
            className="grid gap-5 rounded-[28px] border border-gold/40 bg-white/70 p-4 sm:grid-cols-[180px_1fr] sm:p-5"
          >
            <SafeImage
              src={look.afterUrl}
              alt={`${OCCASION_COPY[look.occasion].label} look`}
              className="aspect-[4/5] w-full rounded-2xl"
            />
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-saffron">
                    {OCCASION_COPY[look.occasion].label}
                  </p>
                  <h2 className="font-display text-2xl text-maroon">
                    {formatInr(look.total)}
                    <span className="ml-2 text-base text-ink/50">
                      / {formatInr(look.budget)}
                    </span>
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const next = looks.filter((item) => item.id !== look.id);
                    writeCart(next);
                    setLooks(next);
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
              <ul className="mt-4 divide-y divide-gold/20">
                {look.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="tabular-nums">{formatInr(item.priceInr)}</span>
                  </li>
                ))}
              </ul>
              <p
                className={`mt-3 text-sm ${over ? "text-saffron" : "text-ink/65"}`}
              >
                {over
                  ? `${formatInr(look.total - look.budget)} over the budget you set.`
                  : `${formatInr(look.budget - look.total)} under budget. Four items, one decision.`}
              </p>
            </div>
          </article>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-maroon px-5 py-4 text-ivory">
        <p className="font-display text-2xl">Cart total {formatInr(grand)}</p>
        <p className="text-sm text-ivory/80">
          Checkout is stubbed for the hackathon. The look is the product.
        </p>
      </div>
    </div>
  );
}
