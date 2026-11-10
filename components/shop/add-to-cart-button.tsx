'use client';

import { useState } from 'react';
import { ShoppingCart } from '@/components/icons';

type Carts = {
  product: Record<string, number>;
  service: Record<string, number>;
};

// The storefront keeps its cart in localStorage keyed by shop handle. Seeding it
// here lets a shared item link hand the buyer straight into that shop with the
// item already in the cart.
export function AddToCartButton({
  handle,
  itemId,
  kind,
  stock,
  label,
}: {
  handle: string;
  itemId: string;
  kind: 'product' | 'service';
  stock: number | null;
  label: string;
}) {
  const [added, setAdded] = useState(false);

  function add() {
    const key = `sikatree-cart-${handle}`;
    let carts: Carts = { product: {}, service: {} };
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Carts> | null;
        if (parsed && typeof parsed === 'object') {
          carts = {
            product: { ...(parsed.product ?? {}) },
            service: { ...(parsed.service ?? {}) },
          };
        }
      }
    } catch {
      /* private mode or corrupt storage; start a fresh cart */
    }

    const bucket = kind === 'service' ? 'service' : 'product';
    const current = carts[bucket][itemId] ?? 0;
    const next =
      kind === 'service' ? 1 : stock === null ? current + 1 : Math.min(stock, current + 1);

    if (next > current) {
      carts[bucket][itemId] = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(carts));
      } catch {
        /* storage full or private mode; the shop still opens */
      }
    }

    setAdded(true);
    window.setTimeout(() => {
      window.location.assign(`/${handle}`);
    }, 250);
  }

  return (
    <button
      type="button"
      onClick={add}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-green-main px-6 text-label text-ink transition-[transform,background-color] duration-200 hover:bg-green-main/90 active:scale-[0.99] sm:w-auto"
    >
      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      {added ? 'Opening shop…' : label}
    </button>
  );
}
