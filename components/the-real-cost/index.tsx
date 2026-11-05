'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Accent } from '@/components/ui/accent';
import { cn } from '@/lib/utils';
import {
  TOTAL,
  ITEMS,
  SERUM_PRICE,
  SERUMS,
  ITEMS_ARE_ILLUSTRATIVE,
  FOOTNOTE,
  formatNumber,
} from './config';
import './the-real-cost.css';

const DIR = [1, -1, 1, -1, 1] as const;
const ROT = [-12, 9, -7, 14, -10] as const;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReduced(cb: () => void) {
  const mql = window.matchMedia(REDUCED_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

export function TheRealCost() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'A' | 'B'>('A');
  const initialDigits = String(TOTAL);

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phaseARef = useRef<HTMLDivElement>(null);
  const phaseBRef = useRef<HTMLDivElement>(null);
  const bigPriceRef = useRef<HTMLDivElement>(null);
  const numRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const commaRef = useRef<HTMLSpanElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stampRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const revenueRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLParagraphElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  const metrics = useRef({ receiptWidth: 340, stageHeight: 800 });
  const lastK = useRef(0);
  const phaseRef = useRef<'A' | 'B'>('A');

  const setStripRef = useCallback((j: number) => (el: HTMLDivElement | null) => {
    stripRefs.current[j] = el;
  }, []);
  const setNumRef = useCallback((i: number) => (el: HTMLSpanElement | null) => {
    numRefs.current[i] = el;
  }, []);
  const setTileRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    tileRefs.current[i] = el;
  }, []);

  // Measure receipt width and stage height (ResizeObserver on the stage).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      metrics.current.stageHeight = rect.height;
      const receipt = receiptRef.current;
      if (receipt) metrics.current.receiptWidth = receipt.getBoundingClientRect().width;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Scroll handler: one rAF-throttled pass writing straight to refs.
  useLayoutEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    const render = () => {
      raf = 0;
      const p = clamp01(
        -track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - stage.offsetHeight),
      );

      const wA = 1 - smoothstep((p - 0.58) / 0.04);
      const wB = smoothstep((p - 0.62) / 0.04);

      if (process.env.NODE_ENV !== 'production' && wA > 0 && wB > 0) {
        console.warn('[TheRealCost] wA and wB both > 0', wA, wB, p);
      }

      if (phaseARef.current) {
        phaseARef.current.style.opacity = String(wA);
        phaseARef.current.style.visibility = wA <= 0 ? 'hidden' : 'visible';
      }
      if (phaseBRef.current) {
        phaseBRef.current.style.opacity = String(wB);
        phaseBRef.current.style.visibility = wB <= 0 ? 'hidden' : 'visible';
      }

      const { receiptWidth, stageHeight } = metrics.current;
      let remaining = TOTAL;
      for (let j = 0; j < ITEMS.length; j++) {
        const c = smoothstep((p - (0.04 + j * 0.09)) / 0.09);
        const strip = stripRefs.current[j];
        if (strip) {
          const x = DIR[j] * c * receiptWidth * 0.8;
          const y = c * stageHeight * 0.35;
          const rotate = ROT[j] * c;
          const opacity = 1 - smoothstep((c - 0.3) / 0.7);
          strip.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
          strip.style.opacity = String(opacity);
          strip.style.boxShadow = `0 ${8 + 16 * c}px ${24 + 16 * c}px -12px rgba(0, 0, 0, ${(0.35 + 0.25 * c).toFixed(3)})`;
        }
        remaining -= ITEMS[j].amount * c;
      }

      const displayed = Math.max(0, Math.round(remaining));
      const formatted = formatNumber(displayed);
      const digits = formatted.replace(/,/g, '');
      const hasComma = formatted.includes(',');
      for (let i = 0; i < 4; i++) {
        const cell = numRefs.current[i];
        if (!cell) continue;
        const ch = digits[i] ?? '';
        if (cell.textContent !== ch) cell.textContent = ch;
        const display = ch ? 'inline-block' : 'none';
        if (cell.style.display !== display) cell.style.display = display;
      }
      if (commaRef.current) {
        const comma = commaRef.current;
        const display = hasComma ? 'inline-block' : 'none';
        if (comma.style.display !== display) comma.style.display = display;
        const text = hasComma ? ',' : '';
        if (comma.textContent !== text) comma.textContent = text;
      }
      if (bigPriceRef.current) bigPriceRef.current.style.setProperty('--t', String(1 - displayed / TOTAL));

      const stampC = smoothstep((p - 0.47) / 0.04);
      if (stampRef.current) {
        stampRef.current.style.opacity = String(stampC);
        stampRef.current.style.transform = `translate(-50%, -50%) scale(${1.5 - 0.5 * stampC}) rotate(-8deg)`;
      }

      const captionC = smoothstep((p - 0.49) / 0.04);
      if (captionRef.current) captionRef.current.style.opacity = String(captionC);

      if (hintRef.current) hintRef.current.style.opacity = p > 0.03 ? '0' : '1';

      const k = Math.round(SERUMS * smoothstep((p - 0.68) / 0.24));
      if (k !== lastK.current) {
        for (let i = 0; i < SERUMS; i++) tileRefs.current[i]?.classList.toggle('on', i < k);
        lastK.current = k;
      }
      const revenue = k * SERUM_PRICE;
      if (counterRef.current) counterRef.current.textContent = String(k);
      if (revenueRef.current) {
        revenueRef.current.textContent = `GH₵${formatNumber(revenue)} of GH₵${formatNumber(TOTAL)}`;
      }
      if (barRef.current) barRef.current.style.width = `${Math.min(100, (revenue / TOTAL) * 100)}%`;

      const closeC = smoothstep((p - 0.93) / 0.04);
      if (closingRef.current) closingRef.current.style.opacity = String(closeC);

      const newPhase: 'A' | 'B' = wB > 0.5 ? 'B' : 'A';
      if (newPhase !== phaseRef.current) {
        phaseRef.current = newPhase;
        setPhase(newPhase);
      }
    };

    let raf = 0;
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    render();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const renderReceipt = (isStatic: boolean) => (
    <div className="trc-receipt" ref={isStatic ? undefined : receiptRef}>
      <div className="trc-strip trc-strip-header">
        <div className="trc-header-row">
          <span>INVOICE</span>
          <span>No. 0001</span>
        </div>
        <div className="trc-header-sub">Custom website</div>
      </div>
      {ITEMS.map((item, j) => (
        <div
          key={item.label}
          ref={isStatic ? undefined : setStripRef(j)}
          className={cn('trc-strip trc-strip-item', isStatic && 'is-static')}
        >
          <span className="trc-item-label">{item.label}</span>
          <span className="trc-item-dots" />
          <span className="trc-item-amount">GH₵{formatNumber(item.amount)}</span>
        </div>
      ))}
    </div>
  );

  const renderGrid = (isStatic: boolean) => (
    <div className="trc-grid">
      {Array.from({ length: SERUMS }).map((_, i) => (
        <div
          key={i}
          ref={isStatic ? undefined : setTileRef(i)}
          className={cn('trc-tile', isStatic && 'on')}
        >
          <svg className="trc-tile-glyph" width="14" height="14" aria-hidden="true">
            <use href="#trc-dropper" />
          </svg>
        </div>
      ))}
    </div>
  );

  const dropperSymbol = (
    <symbol id="trc-dropper" viewBox="0 0 24 24">
      <rect x="10.5" y="2" width="3" height="3.5" rx="1.5" fill="currentColor" />
      <rect x="11.25" y="5.5" width="1.5" height="3" fill="currentColor" />
      <path
        d="M8.5 8.5h7a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-6a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="currentColor"
      />
    </symbol>
  );

  return (
    <section className="trc" aria-label="The real cost">
      <svg className="trc-defs" aria-hidden="true" focusable="false">
        {dropperSymbol}
      </svg>

      <div className={reduced ? 'trc-static' : 'sr-only'}>
        <div className="trc-static-inner">
          <h2 className="trc-static-heading">
            A standard website for a small business in Ghana costs about GH₵
            <span className="trc-static-num">{formatNumber(TOTAL)}</span>.
          </h2>
          <div className="trc-static-receipt">
            {renderReceipt(true)}
            <div className="trc-stamp trc-stamp-static">NOTHING TO PAY</div>
          </div>
          <p className="trc-static-line">
            With sikatree you start at{' '}
            <span className="trc-static-zero">
              GH₵<span className="trc-static-zero-num">0</span>
            </span>
            . No monthly fee, and you pay only when you sell.
          </p>
          {renderGrid(true)}
          <p className="trc-static-closing">
            To pay off a GH₵{formatNumber(TOTAL)} website, a skincare vendor selling serums at GH₵
            {formatNumber(SERUM_PRICE)} has to sell {SERUMS} of them. That is revenue, before any
            profit. On sikatree there is nothing to pay off before your first sale.
          </p>
          {ITEMS_ARE_ILLUSTRATIVE && <p className="trc-footnote">{FOOTNOTE}</p>}
        </div>
      </div>

      {!reduced && (
        <div ref={trackRef} className="trc-track" style={{ height: '320vh' }}>
          <div ref={stageRef} className="trc-stage" aria-hidden="true">
            <div ref={phaseARef} className="trc-phase trc-phase-a">
              <div className="trc-a-grid">
                <div className="trc-a-left">
                  <Eyebrow>The real cost</Eyebrow>
                  <p className="trc-lead">A standard website for a small business in Ghana</p>
                  <div className="trc-bigprice" ref={bigPriceRef}>
                    <span className="trc-bigprice-currency">GH₵</span>
                    <span className="trc-bigprice-number">
                      <span className="trc-num-cell" ref={setNumRef(0)}>
                        {initialDigits[0]}
                      </span>
                      <span className="trc-num-comma" ref={commaRef}>
                        ,
                      </span>
                      <span className="trc-num-cell" ref={setNumRef(1)}>
                        {initialDigits[1] ?? ''}
                      </span>
                      <span className="trc-num-cell" ref={setNumRef(2)}>
                        {initialDigits[2] ?? ''}
                      </span>
                      <span className="trc-num-cell" ref={setNumRef(3)}>
                        {initialDigits[3] ?? ''}
                      </span>
                    </span>
                  </div>
                  <p className="trc-caption" ref={captionRef}>
                    No monthly fee. Pay only when you sell.
                  </p>
                </div>
                <div className="trc-a-right">
                  <div className="trc-receipt-wrap">
                    {renderReceipt(false)}
                    <div className="trc-stamp" ref={stampRef}>
                      NOTHING TO PAY
                    </div>
                  </div>
                  {ITEMS_ARE_ILLUSTRATIVE && <p className="trc-footnote">{FOOTNOTE}</p>}
                </div>
              </div>
            </div>

            <div ref={phaseBRef} className="trc-phase trc-phase-b">
              <div className="trc-b-inner">
                <p className="trc-lead">To pay off that website, Ama’s Glow has to sell</p>
                <div className="trc-counter">
                  <span className="trc-counter-num" ref={counterRef}>
                    0
                  </span>
                  <span className="trc-counter-unit">serums at GH₵{formatNumber(SERUM_PRICE)} each</span>
                </div>
                {renderGrid(false)}
                <div className="trc-revenue">
                  <span className="trc-revenue-text" ref={revenueRef}>
                    GH₵0 of GH₵{formatNumber(TOTAL)}
                  </span>
                  <div className="trc-revenue-bar">
                    <div className="trc-revenue-fill" ref={barRef} />
                  </div>
                </div>
                <p className="trc-closing" ref={closingRef}>
                  That’s revenue, before any profit. On sikatree,{' '}
                  <Accent>there’s nothing to pay off</Accent> before your first sale.
                </p>
              </div>
            </div>

            <div className="trc-hint" ref={hintRef}>
              Scroll
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
