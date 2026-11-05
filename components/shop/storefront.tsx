'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  MessageCircle,
  Plus,
  ShoppingCart,
  X,
} from '@/components/icons';
import { submitOrder } from '@/lib/checkout-actions';
import type { CheckoutOrder, Fulfilment } from '@/lib/orders';
import { accentFor } from '@/lib/shop-accent';
import {
  badgeLabel,
  filterItems,
  DELIVERY_FEE_PESEWAS,
  formatShopPrice,
  hasDescription,
  pageWindow,
  PAGE_SIZE,
  soldOutLast,
  sortItems,
  stockLabel,
  type ShopItem,
  type SortKey,
} from '@/lib/shop';
import { cn } from '@/lib/utils';
import './shop.css';

export type StorefrontVendor = {
  name: string;
  handle: string;
  phone: string;
  bio: string | null;
  location: string | null;
  category: string | null;
  accent: string | null;
  cardImageRatio: string;
  type: 'products' | 'services' | 'both' | null;
};

const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  'price-asc': 'Price low to high',
  'price-desc': 'Price high to low',
  newest: 'Newest',
};

const FALLBACK_TINTS = ['#ddf3e5', '#eadcc8', '#e9dfe4', '#dfe7ea', '#ece5d6'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function whatsappNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function enquiryHref(phone: string, item: ShopItem): string {
  const message = `Hi, I'm interested in ${item.name} (${formatShopPrice(
    item.pricePesewas,
  )}). Is it available?`;
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message)}`;
}

const BOOKING_TIMES = Array.from({ length: 17 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

const fieldCls =
  'h-11 w-full rounded-[12px] border border-[var(--shop-hair)] bg-white px-3 text-[14px] text-[var(--shop-ink)] outline-none focus:border-[var(--shop-accent-deep)] focus:ring-2 focus:ring-[var(--shop-accent-deep)]';

const areaCls =
  'min-h-[84px] w-full rounded-[12px] border border-[var(--shop-hair)] bg-white px-3 py-2 text-[14px] text-[var(--shop-ink)] outline-none focus:border-[var(--shop-accent-deep)] focus:ring-2 focus:ring-[var(--shop-accent-deep)]';

function storeWhatsappHref(phone: string, name: string): string {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(
    `Hi ${name}, I found you on sikatree.`,
  )}`;
}

  function ProductCard({
    item,
    phone,
    priority,
    tint,
    onAdd,
  }: {
    item: ShopItem;
    phone: string;
    priority: boolean;
    tint: string;
    onAdd: (id: string) => void;
  }) {
    const soldOut = item.stock !== null && item.stock <= 0;
    const low = stockLabel(item.stock);
    const badge = badgeLabel(item.badge);
    const desc = hasDescription(item);
    const focal = `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%`;
    const href = enquiryHref(phone, item);
    const price = formatShopPrice(item.pricePesewas);

    return (
      <article
        className="shop-card group relative flex flex-col rounded-[20px] border border-[var(--shop-hair)] bg-[var(--shop-card)] p-2 shadow-[0_1px_2px_rgba(16,17,31,0.04)] sm:p-2.5"
      >
        <div
          className={cn(
            'shop-media relative w-full overflow-hidden rounded-[14px]',
            item.imageUrlAlt && 'shop-has-alt',
          )}
          style={{ aspectRatio: 'var(--card-image-ratio)' }}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              sizes="(min-width:1280px) 256px, (min-width:768px) 33vw, 50vw"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className={cn(
                'shop-img absolute inset-0 h-full w-full object-cover',
                soldOut && 'grayscale-[0.6]',
              )}
              style={{ objectPosition: focal }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: tint }}
            >
              <span className="text-[32px] font-medium" style={{ color: 'var(--shop-ink)', opacity: 0.35 }}>
                {item.name.charAt(0)}
              </span>
            </div>
          )}

          {item.imageUrlAlt ? (
            <img
              src={item.imageUrlAlt}
              alt=""
              aria-hidden="true"
              sizes="(min-width:1280px) 256px, (min-width:768px) 33vw, 50vw"
              loading="lazy"
              className={cn(
                'shop-img-alt absolute inset-0 h-full w-full object-cover',
                soldOut && 'grayscale-[0.6]',
              )}
              style={{ objectPosition: focal }}
            />
          ) : null}

          {badge ? (
            <span className="shop-badge pointer-events-none absolute left-2 top-2 z-30 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              {badge}
            </span>
          ) : null}

          {soldOut ? (
            <span className="pointer-events-none absolute bottom-2 left-2 z-30 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[var(--shop-ink)] shadow-sm">
              Sold out
            </span>
          ) : null}

          {desc ? (
            <>
              <div className="shop-scrim pointer-events-none absolute inset-0 z-20" />
              <div className="shop-desc pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-10 pt-6">
                <p className="line-clamp-3 text-[13px] leading-snug text-white">
                  {item.description}
                </p>
              </div>
            </>
          ) : null}

          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="shop-view absolute bottom-2 left-2 z-30 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[var(--shop-ink)]"
          >
            Enquire <ArrowRight className="h-3 w-3" />
          </a>

          {!soldOut ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAdd(item.id);
              }}
              aria-label={`Add ${item.name} to cart`}
              className="shop-add shop-press absolute bottom-2 right-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--shop-ink)] shadow-[0_4px_14px_rgba(16,17,31,0.18)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-1 pb-0.5 pt-2 sm:px-1.5 sm:pt-3">
          <h3 className="truncate text-[14px] font-semibold leading-[1.1] text-[var(--shop-ink)] sm:text-[16px]">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="shop-name after:absolute after:inset-0 after:z-20 after:content-['']"
            >
              {item.name}
            </a>
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-0.5 leading-none">
            <span className="flex items-baseline gap-1.5">
              <span className="whitespace-nowrap tabular-nums leading-none text-[14px] text-[var(--shop-ink)] sm:text-[15px]">
                {price}
              </span>
              {item.compareAtPesewas ? (
                <span className="whitespace-nowrap tabular-nums leading-none text-[11px] text-[var(--shop-muted)] line-through">
                  {formatShopPrice(item.compareAtPesewas)}
                </span>
              ) : null}
            </span>
            {low ? (
              <span className="whitespace-nowrap text-right text-[11px] leading-none text-[var(--shop-low)]">
                {low}
              </span>
            ) : null}
          </div>

          {desc ? (
            <p
              aria-hidden="true"
              className="shop-touch-desc mt-0.5 text-[12px] leading-[1.25] text-[var(--shop-muted)]"
            >
              {item.description}
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  function FiltersBody({
    min: minValue,
    max: maxValue,
    inStockOnly: inStock,
    onApply,
  }: {
    min: string;
    max: string;
    inStockOnly: boolean;
    onApply: (patch: Record<string, string | null>) => void;
  }) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onApply({
            min: String(data.get('min') ?? ''),
            max: String(data.get('max') ?? ''),
            stock: data.get('stock') ? '1' : null,
          });
        }}
        className="space-y-4 rounded-[20px] border border-[var(--shop-hair)] bg-[var(--shop-card)] p-4"
      >
        <p className="text-[13px] font-medium text-[var(--shop-ink)]">Price (GH₵)</p>
        <div className="flex items-center gap-2">
          <input
            name="min"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={minValue}
            placeholder="Min"
            className="h-11 w-full rounded-[12px] border border-[var(--shop-hair)] bg-[var(--shop-card)] px-3 text-[13px]"
          />
          <span className="text-[var(--shop-muted)]">–</span>
          <input
            name="max"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={maxValue}
            placeholder="Max"
            className="h-11 w-full rounded-[12px] border border-[var(--shop-hair)] bg-[var(--shop-card)] px-3 text-[13px]"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[var(--shop-ink)]">
          <input type="checkbox" name="stock" defaultChecked={inStock} className="h-4 w-4" />
          In stock only
        </label>
        <button
          type="submit"
          className="h-11 w-full rounded-pill text-[13px] font-medium"
          style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-label)' }}
        >
          Apply filters
        </button>
      </form>
    );
  }

export function Storefront({
  vendor,
  items,
  pageUrl,
  domain,
}: {
  vendor: StorefrontVendor;
  items: ShopItem[];
  pageUrl: string;
  domain: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = (params.get('sort') as SortKey) || 'featured';
  const rawPage = Number(params.get('page') ?? '1');
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';
  const inStockOnly = params.get('stock') === '1';

  const [query, setQuery] = useState(q);
  const queryTimer = useRef<number | undefined>(undefined);

  useEffect(() => setQuery(q), [q]);
  useEffect(() => () => window.clearTimeout(queryTimer.current), []);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const headerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const checkoutRef = useRef<HTMLDialogElement>(null);
  const [stuck, setStuck] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartReady, setCartReady] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [fulfilment, setFulfilment] = useState<Fulfilment>(
    vendor.type === 'services' ? 'appointment' : 'delivery',
  );
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');

  const cartKey = `sikatree-cart-${vendor.handle}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setCart(parsed as Record<string, number>);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setCartReady(true);
  }, [cartKey]);

  useEffect(() => {
    if (!cartReady) return;
    try {
      window.localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      /* storage full or private mode */
    }
  }, [cart, cartKey, cartReady]);
  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const gridHeadingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    gridHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gridHeadingRef.current?.focus({ preventScroll: true });
  }, [page]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))],
    [items],
  );

  const minPesewas = min ? Math.round(Number(min) * 100) : null;
  const maxPesewas = max ? Math.round(Number(max) * 100) : null;

  const filtered = useMemo(() => {
    const base = filterItems(items, {
      q: query,
      category,
      minPesewas: Number.isFinite(minPesewas) ? minPesewas : null,
      maxPesewas: Number.isFinite(maxPesewas) ? maxPesewas : null,
      inStockOnly,
    });
    return soldOutLast(sortItems(base, sort));
  }, [items, query, category, sort, minPesewas, maxPesewas, inStockOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const showSearch = items.length > 12;
  const showSort = items.length > 8;
  const showChips = categories.length >= 2;
  const showSidebar = items.length >= 40;
  const hasProducts = items.length > 0;
  const sellingServices = vendor.type === 'services';

  const cartLines = useMemo(
    () =>
      Object.entries(cart).flatMap(([id, quantity]) => {
        const item = items.find((candidate) => candidate.id === id);
        return item ? [{ item, quantity }] : [];
      }),
    [cart, items],
  );
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalPesewas = cartLines.reduce(
    (sum, line) => sum + line.item.pricePesewas * line.quantity,
    0,
  );
  const deliveryPesewas =
    !sellingServices && fulfilment === 'delivery' ? DELIVERY_FEE_PESEWAS : 0;
  const totalPesewas = subtotalPesewas + deliveryPesewas;
  const today = new Date().toISOString().slice(0, 10);

  const accent = accentFor(vendor.accent);
  const themeStyle = {
    '--shop-bg': 'var(--bg-page)',
    '--shop-card': '#ffffff',
    '--shop-ink': 'var(--ink)',
    '--shop-muted': 'var(--ink-muted)',
    '--shop-hair': 'var(--hairline)',
    '--shop-accent': accent.hex,
    '--shop-accent-label': accent.label,
    '--shop-accent-deep': 'var(--green-deep)',
    '--shop-low': 'var(--danger)',
    '--card-image-ratio': vendor.cardImageRatio || '1 / 1',
    '--shop-ease': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  } as CSSProperties & Record<string, string>;

  function navigate(
    patch: Record<string, string | null>,
    options: { resetPage?: boolean } = {},
  ) {
    const next = new URLSearchParams(
      typeof window === 'undefined' ? params.toString() : window.location.search,
    );
    if (options.resetPage !== false) next.delete('page');
    for (const [key, value] of Object.entries(patch)) {
      const remove =
        value === null ||
        value === '' ||
        (key === 'category' && value === 'All') ||
        (key === 'sort' && value === 'featured');
      if (remove) next.delete(key);
      else next.set(key, value as string);
    }
    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  function pageHref(target: number): string {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete('page');
    else next.set('page', String(target));
    const queryString = next.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function onQuery(value: string) {
    setQuery(value);
    window.clearTimeout(queryTimer.current);
    queryTimer.current = window.setTimeout(() => navigate({ q: value || null }), 250);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function addToCart(id: string) {
    setCart((previous) => ({
      ...previous,
      [id]: Math.min((previous[id] ?? 0) + 1, 20),
    }));
  }

  function changeQuantity(id: string, quantity: number) {
    setCart((previous) => {
      const next = { ...previous };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(quantity, 20);
      return next;
    });
  }

  function openCheckout() {
    if (!cartCount) return;
    setCheckoutError(null);
    setOrder(null);
    const dialog = checkoutRef.current;
    if (!dialog) return;
    dialog.classList.remove('is-closing');
    dialog.showModal();
  }

  function closeCheckout() {
    const dialog = checkoutRef.current;
    if (!dialog || dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');
    window.setTimeout(() => {
      dialog.classList.remove('is-closing');
      dialog.close();
    }, 170);
  }

  async function onCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartCount || placing) return;

    setPlacing(true);
    setCheckoutError(null);

    const data = new FormData(event.currentTarget);
    data.set('handle', vendor.handle);
    data.set(
      'cart',
      JSON.stringify(cartLines.map((line) => ({ id: line.item.id, quantity: line.quantity }))),
    );
    data.set('fulfilment', sellingServices ? 'appointment' : fulfilment);
    data.set('bookingDate', bookingDate);
    data.set('bookingTime', bookingTime);

    try {
      const result = await submitOrder(data);
      if (result.ok) {
        const placed = result.order;
        setLeaving(true);
        window.setTimeout(() => {
          setOrder(placed);
          setCart({});
          setLeaving(false);
        }, 190);
      } else {
        setCheckoutError(result.error);
      }
    } catch {
      setCheckoutError('Could not place the order. Try again.');
    } finally {
      setPlacing(false);
    }
  }

  const locationLine = [vendor.category, vendor.location].filter(Boolean).join(', ');
  const ctaHref = storeWhatsappHref(vendor.phone, vendor.name);

  return (
    <div className="shop-root min-h-screen bg-[var(--shop-bg)] pb-16" style={themeStyle}>
      {/* Sticky bar appears once the header leaves the viewport. */}
      <div
        aria-hidden={!stuck}
        inert={!stuck}
        className={cn(
          'fixed inset-x-0 top-0 z-30 transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          stuck ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
        )}
      >
        <div className="border-b border-[var(--shop-hair)] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
            <span className="min-w-0 truncate text-[15px] font-medium text-[var(--shop-ink)]">
              {vendor.name}
            </span>
            {hasProducts ? (
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative h-10 w-10 shrink-0">
                  {cartCount > 0 ? (
                    <button
                      type="button"
                      onClick={openCheckout}
                      aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
                      className="shop-cart-in absolute inset-0 flex items-center justify-center rounded-full border border-[var(--shop-hair)] bg-white text-[var(--shop-ink)]"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span
                        key={cartCount}
                        className="shop-badge-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--shop-ink)] px-1 text-[10px] font-semibold text-white"
                      >
                        {cartCount}
                      </span>
                    </button>
                  ) : null}
                </div>
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium min-[400px]:px-4"
                  style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-label)' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden min-[400px]:inline">Chat on WhatsApp</span>
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 sm:px-6 sm:pt-6">
        <div
          ref={headerRef}
          className="rounded-[28px] border border-[var(--shop-hair)] bg-[var(--shop-card)] p-5 sm:rounded-[32px] sm:p-7"
        >
          <div className="flex items-start gap-3 sm:items-center sm:gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mint-100 text-[18px] font-semibold text-green-deep">
              {initials(vendor.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="font-medium text-[var(--shop-ink)]"
                style={{
                  fontSize: 'clamp(28px, 4vw, 44px)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                }}
              >
                {vendor.name}
              </h1>

              {vendor.bio ? (
                <p className="mt-1 line-clamp-1 text-[14px] leading-snug text-[var(--shop-muted)] sm:line-clamp-2">
                  {vendor.bio}
                </p>
              ) : null}

              {locationLine ? (
                <p className="mt-1 text-[14px] text-[var(--shop-muted)]">
                  {locationLine}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--shop-bg)] px-2.5 py-1 text-[12px] text-[var(--shop-muted)] sm:text-[13px]">
                  {domain}/{vendor.handle}
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] text-[var(--shop-muted)] transition-colors hover:text-[var(--shop-ink)]"
                  aria-label="Copy store link"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <span role="status" aria-live="polite" className="sr-only">
                  {copied ? 'Copied' : ''}
                </span>
              </div>
            </div>

            {hasProducts ? (
              <div className="hidden shrink-0 sm:block">
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-pill px-6 text-[15px] font-medium transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-label)' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              </div>
            ) : null}
          </div>

          {hasProducts ? (
            <div className="mt-4 sm:hidden">
              <a
                href={ctaHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-pill text-[15px] font-medium active:scale-[0.99]"
                style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-accent-label)' }}
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          ) : null}
        </div>

        {/* Toolbar: chips first, then the controls a small catalogue needs. */}
        {(showChips || showSearch || showSort) && hasProducts ? (
          <div className="mb-4 mt-6 flex flex-col gap-3">
            {showSearch ? (
              <label className="relative block">
                <span className="sr-only">Search products</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQuery(event.target.value)}
                  placeholder="Search products"
                  className="h-11 w-full rounded-pill border border-[var(--shop-hair)] bg-[var(--shop-card)] px-4 text-[14px] text-[var(--shop-ink)] placeholder:text-[var(--shop-muted)] focus:border-[var(--shop-accent-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent-deep)]"
                />
              </label>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {showChips ? (
                <div className="no-scrollbar -mx-1 flex flex-1 snap-x gap-2 overflow-x-auto px-1">
                  {['All', ...categories].map((option) => {
                    const active = option === 'All' ? !category : category === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => navigate({ category: option === 'All' ? null : option })}
                        aria-pressed={active}
                        className={cn(
                          'h-11 shrink-0 snap-start rounded-[10px] border px-3.5 text-[13px] font-medium transition-colors duration-200',
                          active
                            ? 'border-transparent bg-[var(--shop-ink)] text-white'
                            : 'border-[var(--shop-hair)] bg-[var(--shop-card)] text-[var(--shop-ink)] hover:border-[var(--shop-muted)]',
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              <div className="flex items-center gap-2 sm:ml-auto">
                {showSort ? (
                  <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
                    <span className="sr-only">Sort products</span>
                    <select
                      value={sort}
                      onChange={(event) => navigate({ sort: event.target.value })}
                      className="h-11 w-full appearance-none rounded-[12px] border border-[var(--shop-hair)] bg-[var(--shop-card)] pl-3 pr-9 text-[13px] text-[var(--shop-ink)] focus:border-[var(--shop-accent-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent-deep)] sm:w-auto"
                    >
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                        <option key={key} value={key}>
                          {SORT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--shop-muted)]" />
                  </label>
                ) : null}

                <div className="relative h-11 w-11 shrink-0">
                  {cartCount > 0 ? (
                    <button
                      type="button"
                      onClick={openCheckout}
                      aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
                      className="shop-cart-in absolute inset-0 flex items-center justify-center rounded-full border border-[var(--shop-hair)] bg-white text-[var(--shop-ink)] shadow-[0_1px_3px_rgba(16,17,31,0.08)]"
                    >
                      <ShoppingCart className="h-[18px] w-[18px]" />
                      <span
                        key={cartCount}
                        className="shop-badge-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--shop-ink)] px-1 text-[10px] font-semibold text-white"
                      >
                        {cartCount}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6" />
        )}

        <div
          className={cn(
            showSidebar && 'lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-6',
          )}
        >
          {showSidebar ? (
            <aside className="hidden lg:block">
              <FiltersBody
                min={min}
                max={max}
                inStockOnly={inStockOnly}
                onApply={(patch) => navigate(patch)}
              />
            </aside>
          ) : null}

          <div className="min-w-0">
            {showSidebar ? (
              <button
                type="button"
                onClick={() => sheetRef.current?.showModal()}
                className="mb-3 inline-flex h-11 items-center rounded-pill border border-[var(--shop-hair)] bg-[var(--shop-card)] px-4 text-[13px] lg:hidden"
              >
                Filters
              </button>
            ) : null}

            <h2 ref={gridHeadingRef} tabIndex={-1} className="sr-only">
              Products
            </h2>

            <div
              aria-busy={isPending}
              className={cn(
                'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4',
                items.length >= 8 ? 'xl:grid-cols-4 xl:gap-5' : 'xl:grid-cols-3 xl:gap-5',
                'transition-opacity duration-200',
                isPending && 'opacity-60',
              )}
            >
              {visible.map((item, index) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  phone={vendor.phone}
                  priority={index < 4}
                  tint={FALLBACK_TINTS[index % FALLBACK_TINTS.length]}
                  onAdd={addToCart}
                />
              ))}
            </div>

            {!filtered.length ? (
              hasProducts ? (
                <div className="rounded-[20px] border border-[var(--shop-hair)] bg-[var(--shop-card)] px-6 py-14 text-center">
                  <p className="text-[16px] font-medium text-[var(--shop-ink)]">No products match</p>
                  <p className="mt-1 text-[13px] text-[var(--shop-muted)]">
                    Try another search or clear the filters.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ q: null, category: null, min: null, max: null, stock: null })
                    }
                    className="mt-4 inline-flex h-11 items-center rounded-pill border border-[var(--shop-hair)] px-5 text-[13px] font-medium text-[var(--shop-ink)]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="rounded-[20px] border border-[var(--shop-hair)] bg-[var(--shop-card)] px-6 py-14 text-center">
                  <p className="text-[16px] font-medium text-[var(--shop-ink)]">Nothing here yet</p>
                  <p className="mt-1 text-[13px] text-[var(--shop-muted)]">
                    This shop is still being set up. Check back soon.
                  </p>
                </div>
              )
            ) : null}

            {filtered.length > PAGE_SIZE ? (
              <div className="mt-10 flex flex-col items-center gap-4">
                <p className="text-[13px] text-[var(--shop-muted)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
                  <span className="text-[var(--shop-accent-deep)]">{filtered.length}</span>{' '}
                  Products
                </p>
                <nav aria-label="Pagination" className="flex items-center gap-1.5">
                  {pageWindow(currentPage, totalPages).map((entry, index) =>
                    entry === 'ellipsis' ? (
                      <span key={`gap-${index}`} className="px-1 text-[13px] text-[var(--shop-muted)]">
                        …
                      </span>
                    ) : entry === currentPage ? (
                      <span
                        key={entry}
                        aria-current="page"
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--shop-ink)] text-[13px] font-medium text-white sm:h-9 sm:w-9"
                      >
                        {entry}
                      </span>
                    ) : (
                      <Link
                        key={entry}
                        href={pageHref(entry)}
                        scroll={false}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--shop-hair)] bg-[var(--shop-card)] text-[13px] text-[var(--shop-ink)] hover:border-[var(--shop-muted)] sm:h-9 sm:w-9"
                      >
                        {entry}
                      </Link>
                    ),
                  )}
                </nav>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-[var(--shop-hair)] py-6 text-[12px] text-[var(--shop-muted)] sm:flex-row">
          <p className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--shop-ink)]"
            >
              sikatree
            </Link>
            <span>Powered by sikatree</span>
          </p>
          <Link href="/#waitlist" className="hover:text-[var(--shop-ink)] hover:underline">
            Get your own free store
          </Link>
        </footer>
      </div>

      <dialog ref={sheetRef} className="shop-sheet">
        <div className="rounded-t-[24px] bg-[var(--shop-card)] p-5 pb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-medium">Filters</p>
            <button
              type="button"
              onClick={() => sheetRef.current?.close()}
              className="h-9 rounded-pill border border-[var(--shop-hair)] px-3 text-[13px]"
            >
              Close
            </button>
          </div>
          <FiltersBody
            min={min}
            max={max}
            inStockOnly={inStockOnly}
            onApply={(patch) => {
              navigate(patch);
              sheetRef.current?.close();
            }}
          />
        </div>
      </dialog>

      <dialog
        ref={checkoutRef}
        aria-label="Checkout"
        className="shop-checkout"
        onCancel={(event) => {
          event.preventDefault();
          closeCheckout();
        }}
        onClose={() => {
          setOrder(null);
          setCheckoutError(null);
        }}
      >
        <div className="shop-checkout-panel w-[min(960px,calc(100vw-24px))] max-h-[92vh] overflow-y-auto rounded-[24px] bg-white p-5 sm:p-7">
          {order ? (
            <div className="shop-success-in mx-auto max-w-[520px] py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint-100 text-green-deep">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-h2 text-ink">Thank you!</h2>
              <p className="mt-1 text-[14px] text-[var(--shop-muted)]">Your order has been placed.</p>

              <div className="my-6 border-t border-dashed border-[var(--shop-hair)]" />

              <div className="flex items-start justify-between text-left">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--shop-muted)]">
                    Order ID
                  </p>
                  <p className="mt-1 text-[18px] font-medium text-[var(--shop-ink)]">{order.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--shop-muted)]">
                    Amount
                  </p>
                  <p className="mt-1 text-[18px] font-medium text-[var(--shop-ink)]">
                    {formatShopPrice(order.totalPesewas)}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-2 text-left text-[13px] text-[var(--shop-ink)]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--shop-muted)]">Placed</dt>
                  <dd>{formatOrderDate(order.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--shop-muted)]">ETA</dt>
                  <dd className="text-right">{order.eta}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--shop-muted)]">Email</dt>
                  <dd className="truncate text-right">{order.email}</dd>
                </div>
              </dl>

              <div className="my-6 border-t border-dashed border-[var(--shop-hair)]" />

              <div className="shop-barcode mx-auto h-12 w-full max-w-[280px]" aria-hidden="true" />
              <p className="mt-2 font-mono text-[11px] tracking-[0.3em] text-[var(--shop-muted)]">
                {order.code.replace('ORD-', '')}
              </p>

              <p className="mt-4 text-[12px] leading-relaxed text-[var(--shop-muted)]">
                {order.fulfilment === 'delivery'
                  ? 'Pay on delivery.'
                  : order.fulfilment === 'pickup'
                    ? 'Pay at pickup.'
                    : 'Pay at your appointment.'}{' '}
                {order.vendorName} will confirm shortly.
              </p>

              <button
                type="button"
                onClick={closeCheckout}
                className="shop-press mt-6 h-12 w-full rounded-[12px] bg-[var(--shop-ink)] text-[15px] font-medium text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={onCheckoutSubmit}
              className={cn('grid gap-6 md:grid-cols-[1fr_340px]', leaving && 'shop-form-leave')}
            >
              <div className="min-w-0 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-h2 text-ink">Checkout</h2>
                  <button
                    type="button"
                    onClick={closeCheckout}
                    aria-label="Close checkout"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--shop-hair)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <section>
                  <p className="text-[13px] font-medium text-[var(--shop-ink)]">Your items</p>
                  {cartLines.length ? (
                    <ul className="mt-2 divide-y divide-[var(--shop-hair)]">
                      {cartLines.map(({ item, quantity }) => (
                        <li key={item.id} className="flex gap-3 py-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-page">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-[var(--shop-ink)]">
                              {item.name}
                            </p>
                            <p className="text-[12px] text-[var(--shop-muted)]">
                              {formatShopPrice(item.pricePesewas)}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, quantity - 1)}
                                aria-label={`Remove one ${item.name}`}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--shop-hair)] text-[15px] leading-none"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-[13px] text-[var(--shop-ink)]">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, quantity + 1)}
                                aria-label={`Add one ${item.name}`}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--shop-hair)] text-[15px] leading-none"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <p className="whitespace-nowrap text-[13px] font-medium text-[var(--shop-ink)]">
                            {formatShopPrice(item.pricePesewas * quantity)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-[10px] bg-page p-3 text-[13px] text-[var(--shop-muted)]">
                      Your cart is empty. Close this and add an item first.
                    </p>
                  )}
                </section>

                {sellingServices ? (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <p className="text-[13px] font-medium text-[var(--shop-ink)] sm:col-span-2">
                      Appointment
                    </p>
                    <label className="block text-[13px] font-medium text-[var(--shop-ink)]">
                      Date
                      <input
                        type="date"
                        name="bookingDate"
                        required
                        min={today}
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className={`${fieldCls} mt-1.5`}
                      />
                    </label>
                    <label className="block text-[13px] font-medium text-[var(--shop-ink)]">
                      Time
                      <select
                        name="bookingTime"
                        value={bookingTime}
                        onChange={(event) => setBookingTime(event.target.value)}
                        className={`${fieldCls} mt-1.5`}
                      >
                        {BOOKING_TIMES.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                ) : (
                  <section>
                    <p className="text-[13px] font-medium text-[var(--shop-ink)]">
                      How would you like it?
                    </p>
                    <div className="relative mt-2 grid grid-cols-2 rounded-[12px] border border-[var(--shop-hair)] bg-white p-1">
                      <span
                        aria-hidden="true"
                        className="shop-segment pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[9px] bg-[var(--shop-ink)]"
                        style={{
                          transform:
                            fulfilment === 'pickup' ? 'translateX(100%)' : 'translateX(0)',
                        }}
                      />
                      {(['delivery', 'pickup'] as const).map((option) => {
                        const active = fulfilment === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setFulfilment(option)}
                            className={cn(
                              'relative z-10 h-10 rounded-[9px] text-[13px] font-medium capitalize transition-colors duration-200',
                              active ? 'text-white' : 'text-[var(--shop-ink)]',
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {fulfilment === 'delivery' ? (
                      <label className="mt-3 block text-[13px] font-medium text-[var(--shop-ink)]">
                        Delivery address
                        <textarea
                          name="address"
                          required
                          minLength={8}
                          rows={3}
                          placeholder="Area, street and a landmark"
                          className={`${areaCls} mt-1.5`}
                        />
                      </label>
                    ) : (
                      <p className="mt-3 rounded-[10px] bg-page p-3 text-[12px] text-[var(--shop-muted)]">
                        Pick up at {vendor.location ?? 'the shop'}. {vendor.name} will confirm the
                        time with you.
                      </p>
                    )}
                  </section>
                )}

                <section className="grid gap-3 sm:grid-cols-2">
                  <p className="text-[13px] font-medium text-[var(--shop-ink)] sm:col-span-2">
                    Your details
                  </p>
                  <label className="block text-[13px] font-medium text-[var(--shop-ink)]">
                    Name
                    <input
                      name="name"
                      required
                      minLength={2}
                      autoComplete="name"
                      className={`${fieldCls} mt-1.5`}
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-[var(--shop-ink)]">
                    WhatsApp
                    <input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="024 123 4567"
                      className={`${fieldCls} mt-1.5`}
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-[var(--shop-ink)] sm:col-span-2">
                    Email
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={`${fieldCls} mt-1.5`}
                    />
                    <span className="mt-1 block text-[11px] font-normal text-[var(--shop-muted)]">
                      For delivery and order updates.
                    </span>
                  </label>
                  <label className="block text-[13px] font-medium text-[var(--shop-ink)] sm:col-span-2">
                    Note <span className="font-normal text-[var(--shop-muted)]">(optional)</span>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="Anything the vendor should know"
                      className={`${areaCls} mt-1.5`}
                    />
                  </label>
                </section>

                <p className="rounded-[10px] bg-page p-3 text-[12px] text-[var(--shop-muted)]">
                  {sellingServices
                    ? 'Pay at your appointment.'
                    : fulfilment === 'delivery'
                      ? 'Pay on delivery.'
                      : 'Pay at pickup.'}{' '}
                  Online payment is not enabled yet.
                </p>
              </div>

              <aside className="md:sticky md:top-0 md:self-start">
                <div className="rounded-[20px] border border-[var(--shop-hair)] p-5">
                  <p className="text-[15px] font-medium text-[var(--shop-ink)]">Order Summary</p>
                  <dl className="mt-4 space-y-2 text-[13px] text-[var(--shop-ink)]">
                    <div className="flex justify-between">
                      <dt className="text-[var(--shop-muted)]">Item total</dt>
                      <dd>{formatShopPrice(subtotalPesewas)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--shop-muted)]">Delivery</dt>
                      <dd>{deliveryPesewas ? formatShopPrice(deliveryPesewas) : 'Free'}</dd>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-[var(--shop-hair)] pt-2 text-[15px] font-medium">
                      <dt>Total</dt>
                      <dd>{formatShopPrice(totalPesewas)}</dd>
                    </div>
                  </dl>

                  {checkoutError ? (
                    <p role="alert" className="mt-3 text-[12px] text-danger">
                      {checkoutError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={placing || leaving || !cartCount}
                    className="shop-press relative mt-4 flex h-12 w-full items-center justify-center rounded-[12px] bg-[var(--shop-accent)] px-5 text-[15px] font-medium text-[var(--shop-accent-label)] disabled:opacity-50"
                  >
                    <span>
                      {placing
                        ? 'Placing order…'
                        : `Place order · ${formatShopPrice(totalPesewas)}`}
                    </span>
                    <ChevronRight className="pointer-events-none absolute right-4 h-5 w-5" />
                  </button>

                  <p className="mt-3 text-[11px] leading-snug text-[var(--shop-muted)]">
                    Your email is saved for delivery and order updates. Payment happens on
                    delivery, at pickup, or at your appointment.
                  </p>
                </div>
              </aside>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );

}
