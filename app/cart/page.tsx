import { CartView } from "@/components/cart-view";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron">
        Complete the look
      </p>
      <h1 className="mt-2 font-display text-4xl text-maroon">Cart</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink/70">
        Each row is a full occasion look: outfit, earrings, hairstyle and lip
        shade, priced against the budget you set on Style.
      </p>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
