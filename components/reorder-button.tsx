'use client';

import { useRouter } from 'next/navigation';

// Re-fills the storefront cart with a previous order's items and opens the shop
// (ORD-12). Items that were deleted since the order carry a null id and are
// dropped.
export function ReorderButton({
  handle,
  lines,
}: {
  handle: string;
  lines: { itemId: string; quantity: number }[];
}) {
  const router = useRouter();

  function reorder() {
    const cart: Record<string, number> = {};
    for (const line of lines) cart[line.itemId] = line.quantity;
    try {
      window.localStorage.setItem(`sikatree-cart-${handle}`, JSON.stringify(cart));
    } catch {
      /* private mode */
    }
    router.push(`/${handle}`);
  }

  return (
    <button
      type="button"
      onClick={reorder}
      className="pressable inline-flex h-12 w-full shrink-0 items-center justify-center rounded-pill border border-hairline bg-white px-6 text-label text-ink hover:border-ink/40 sm:w-auto"
    >
      Reorder
    </button>
  );
}
