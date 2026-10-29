import { ModeBadge } from "@/components/mode-badge";
import { OCCASION_COPY, OCCASIONS, formatInr } from "@/data/catalog";
import { UNITS_PER_LOOK } from "@/lib/look/chain";
import { ArrowRight, IndianRupee, Sparkles, Layers } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <ModeBadge
            demoLabel="Demo mode · no API key"
            liveLabel="Live YouCam"
          />
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] text-maroon sm:text-6xl">
            See the whole festive look on you — then buy it as one cart.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/75">
            Shagun is an Indian occasion-styling store. Upload a chest-up selfie,
            pick Diwali, a sangeet, an office party or a wedding, and a rupee
            budget. We assemble an outfit, a hairstyle, earrings and a lip shade,
            then chain four YouCam try-ons — clothes, hair, earrings, lipstick —
            so you are not guessing in a changing-room WhatsApp thread.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/style"
              className="inline-flex items-center gap-2 rounded-full bg-saffron px-6 py-3 text-sm font-semibold text-ivory shadow-[0_8px_24px_rgba(196,92,38,0.28)] hover:bg-maroon"
            >
              Style a look
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-gold/70 px-6 py-3 text-sm font-semibold text-ink hover:bg-gold-soft/20"
            >
              Open cart
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink/60">
            {UNITS_PER_LOOK} YouCam units per full look · clothes 2 + hair 2 +
            earrings 1 + lipstick 1
          </p>
        </div>
        <div className="ornament-border overflow-hidden rounded-[32px] bg-maroon-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/demo/looks/wedding-guest-lipstick.jpg"
            alt="Wedding-guest look rendered on a chest-up selfie"
            className="aspect-[3/4] w-full object-cover object-top"
          />
        </div>
      </section>

      <div className="gold-rule my-14" />

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron">
          How a look is rendered
        </p>
        <h2 className="mt-2 font-display text-3xl text-maroon">
          Clothes, then hair, then earrings, then lipstick
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Layers,
              title: "Clothes VTO",
              body: "cloth-v4 drapes the catalog outfit on your chest-up photo.",
            },
            {
              icon: Sparkles,
              title: "Hair transfer",
              body: "Hairstyle V2.1 first — it redraws the head, so jewellery cannot go before it.",
            },
            {
              icon: Sparkles,
              title: "Earrings 2D",
              body: "Jewellery on the restyled portrait. Skipped if hair covers the lobes.",
            },
            {
              icon: IndianRupee,
              title: "Lipstick VTO",
              body: "Makeup VTO tints the mouth with the catalog hex.",
            },
          ].map((step) => (
            <article
              key={step.title}
              className="rounded-[24px] border border-gold/30 bg-white/60 p-5"
            >
              <step.icon className="size-5 text-saffron" />
              <h3 className="mt-3 font-display text-xl text-maroon">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl text-maroon">Occasions in stock</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {OCCASIONS.map((id) => (
            <Link
              key={id}
              href="/style"
              className="flex gap-4 rounded-[24px] border border-gold/30 bg-white/60 p-4 hover:border-saffron"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/demo/looks/${id}-lipstick.jpg`}
                alt=""
                className="h-28 w-[5.25rem] shrink-0 rounded-2xl object-cover object-top"
              />
              <span className="min-w-0">
                <h3 className="font-display text-2xl text-maroon">
                  {OCCASION_COPY[id].label}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-saffron">
                  {OCCASION_COPY[id].kicker}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  {OCCASION_COPY[id].blurb}
                </p>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-[28px] border border-gold/40 bg-maroon px-6 py-10 text-ivory">
        <h2 className="font-display text-3xl">A cart, not a collage</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ivory/85">
          Complete-the-look is how festive retail actually works: nobody buys a
          lehenga without earrings. Shagun prices the four pieces against your
          budget, shows the combined try-on, and adds them together. Swap any
          one item and only that step onward is re-rendered, so we do not spend
          units twice.
        </p>
        <p className="mt-4 text-sm text-gold-soft">
          An office-party look sits around {formatInr(6860)}. A wedding-guest
          Banarasi set is {formatInr(13160)}.
        </p>
      </section>
    </div>
  );
}
