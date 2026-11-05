'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow } from '@/components/ui/eyebrow';

const FEATURES = [
  { title: 'Free to start', desc: 'No monthly fee. Pay only when you sell.' },
  { title: 'Live in 10 minutes', desc: 'From photos to a link, fast.' },
  { title: 'Catalogue', desc: 'Prices, photos and stock in one page.' },
  { title: 'MoMo checkout', desc: 'MTN, Telecel and AT payments built in.' },
  { title: 'Bookings', desc: 'Set hours, take deposits, skip no-shows.' },
  { title: 'Order codes', desc: 'Every order gets a clear code.' },
  { title: 'WhatsApp alerts', desc: 'Orders land in your chat.' },
  { title: 'Works on any phone', desc: 'Customers tap a link, no app.' },
];

const WORD = 'sikatree';
const HOLD_END = 0.04;
const TRAVEL_END = 0.54;
const ZOOM_START = 0.62;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function chamferDistance(ink: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = ink[i] ? INF : 0;
  const s = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!ink[idx]) continue;
      let m = d[idx];
      if (x > 0) m = Math.min(m, d[idx - 1] + 1);
      if (y > 0) m = Math.min(m, d[idx - w] + 1);
      if (x > 0 && y > 0) m = Math.min(m, d[idx - w - 1] + s);
      if (x < w - 1 && y > 0) m = Math.min(m, d[idx - w + 1] + s);
      d[idx] = m;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const idx = y * w + x;
      if (!ink[idx]) continue;
      let m = d[idx];
      if (x < w - 1) m = Math.min(m, d[idx + 1] + 1);
      if (y < h - 1) m = Math.min(m, d[idx + w] + 1);
      if (x < w - 1 && y < h - 1) m = Math.min(m, d[idx + w + 1] + s);
      if (x > 0 && y < h - 1) m = Math.min(m, d[idx + w - 1] + s);
      d[idx] = m;
    }
  }
  return d;
}

// Rasterize a glyph and return the thickest-stroke center relative to the glyph
// origin (dx) and baseline (dy), plus maxD.
function findGlyphCore(font: string, size: number): { dx: number; dy: number; maxD: number } {
  const pad = Math.ceil(size * 0.4);
  const baseline = Math.ceil(size * 1.2);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { dx: 0, dy: 0, maxD: 1 };

  ctx.font = font;
  const w = Math.ceil(ctx.measureText('e').width) + pad * 2;
  const h = Math.ceil(size * 1.8);
  canvas.width = w;
  canvas.height = h;

  ctx.fillStyle = '#000';
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('e', pad, baseline);

  const img = ctx.getImageData(0, 0, w, h).data;
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = img[i * 4 + 3] > 128 ? 1 : 0;

  const dist = chamferDistance(ink, w, h);
  let best = { x: 0, y: 0, d: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (ink[idx] && dist[idx] > best.d) best = { x, y, d: dist[idx] };
    }
  }
  return { dx: best.x - pad, dy: best.y - baseline, maxD: Math.max(best.d, 1) };
}

export function WhySikatree() {
  const [active, setActive] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [debug, setDebug] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const letterRefs = useRef<(SVGTSpanElement | null)[]>([]);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orbBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const metrics = useRef({
    vw: 1,
    vh: 1,
    letters: [] as { x: number; y: number }[],
    target: { x: 0, y: 0, maxD: 1 },
    S: 1,
    dark: { r: 10, g: 10, b: 10 },
  });

  // Measure everything in a single coordinate space: origin at viewport center.
  const measure = () => {
    const text = textRef.current;
    const svg = svgRef.current;
    const sticky = stickyRef.current;
    if (!text || !svg || !sticky) return;
    const m = metrics.current;

    const rect = sticky.getBoundingClientRect();
    const vw = Math.max(1, rect.width);
    const vh = Math.max(1, rect.height);
    m.vw = vw;
    m.vh = vh;
    svg.setAttribute('viewBox', `${-vw / 2} ${-vh / 2} ${vw} ${vh}`);

    const size = Math.min(160, Math.max(96, vw * 0.18));
    text.style.fontSize = `${size}px`;

    const cs = getComputedStyle(text);
    const ctxFont = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const canvas = document.createElement('canvas').getContext('2d');
    if (!canvas) return;
    canvas.font = ctxFont;
    const xHeight = canvas.measureText('x').actualBoundingBoxAscent || size * 0.5;
    const baselineY = xHeight / 2;
    text.setAttribute('y', String(baselineY));

    const letters: { x: number; y: number }[] = [];
    for (let i = 0; i < WORD.length; i++) {
      let lx = 0;
      try {
        const e = text.getExtentOfChar(i);
        lx = e.x + e.width / 2;
      } catch {
        lx = (i - (WORD.length - 1) / 2) * (size * 0.55);
      }
      const ch = WORD[i];
      const asc = canvas.measureText(ch).actualBoundingBoxAscent || size * 0.7;
      const desc = canvas.measureText(ch).actualBoundingBoxDescent || 0;
      const ly = baselineY - (asc - desc) / 2;
      letters.push({ x: lx, y: ly });
    }
    m.letters = letters;

    const core = findGlyphCore(ctxFont, size);
    let glyphOriginX = 0;
    try {
      glyphOriginX = text.getExtentOfChar(7).x;
    } catch {
      glyphOriginX = m.letters[7] ? m.letters[7].x : 0;
    }
    m.target = { x: glyphOriginX + core.dx, y: baselineY + core.dy, maxD: core.maxD };
    m.S = (Math.hypot(vw / 2, vh / 2) / m.target.maxD) * 1.25;

    const darkHex = getComputedStyle(document.documentElement).getPropertyValue('--bg-dark').trim() || '#0a0a0a';
    m.dark = hexToRgb(darkHex);

    setReady(true);
  };

  useEffect(() => {
    setDebug(window.location.search.includes('debug=1'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      setReady(true);
      return;
    }

    const doMeasure = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
        try {
          const text = textRef.current;
          if (text) {
            const cs = getComputedStyle(text);
            await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
          }
        } catch {
          /* noop */
        }
      }
      measure();
    };
    doMeasure();
  }, []);

  // Scroll-driven render, rAF-throttled, direct DOM writes.
  useEffect(() => {
    if (!ready || reduced) return;

    let raf = 0;
    let resizeTimer = 0;

    const render = () => {
      raf = 0;
      const section = sectionRef.current;
      const sticky = stickyRef.current;
      if (!section || !sticky) return;
      const total = section.offsetHeight - sticky.offsetHeight;
      const p = total > 0 ? clamp01(-section.getBoundingClientRect().top / total) : 0;
      draw(p);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 100);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready, reduced]);

  function draw(p: number) {
    const m = metrics.current;
    const cam = camRef.current;
    const sticky = stickyRef.current;
    const svg = svgRef.current;

    for (let i = 0; i < WORD.length; i++) {
      const arrival = TRAVEL_END - (WORD.length - 1 - i) * 0.03;
      const travel = clamp01((p - HOLD_END) / Math.max(arrival - HOLD_END, 0.0001));
      const tt = easeInOutCubic(travel);
      const crossfade = clamp01((tt - 0.82) / 0.18);
      const tspan = letterRefs.current[i];
      if (tspan) tspan.setAttribute('fill-opacity', String(crossfade));
    }

    const ringR = Math.min(m.vw * 0.4, m.vh * 0.22);
    for (let i = 0; i < FEATURES.length; i++) {
      const wrap = orbRefs.current[i];
      if (!wrap) continue;
      const arrival = TRAVEL_END - (FEATURES.length - 1 - i) * 0.03;
      const travel = clamp01((p - HOLD_END) / Math.max(arrival - HOLD_END, 0.0001));
      const tt = easeInOutCubic(travel);

      const startAngle = (i / FEATURES.length) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(startAngle) * ringR;
      const sy = Math.sin(startAngle) * ringR;
      const lx = m.letters[i] ? m.letters[i].x : 0;
      const ly = m.letters[i] ? m.letters[i].y : 0;

      const x = lerp(sx, lx, tt);
      const y = lerp(sy, ly, tt);
      const crossfade = clamp01((tt - 0.82) / 0.18);
      const orbRadius = lerp(56, 7, tt);

      wrap.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      wrap.style.opacity = String(1 - crossfade);
      wrap.style.pointerEvents = p > HOLD_END ? 'none' : 'auto';

      const btn = orbBtnRefs.current[i];
      if (btn) {
        btn.style.transform = `scale(${orbRadius / 56})`;
        btn.style.backgroundColor = `rgb(${Math.round(lerp(255, m.dark.r, tt))}, ${Math.round(
          lerp(255, m.dark.g, tt),
        )}, ${Math.round(lerp(255, m.dark.b, tt))})`;
        const label = btn.querySelector('span') as HTMLElement | null;
        if (label) label.style.opacity = String(clamp01(1 - tt * 3));
      }
    }

    // Camera (zoom into the final e).
    const u = easeInOutSine(clamp01((p - ZOOM_START) / (1 - ZOOM_START)));
    const s = Math.exp(Math.log(m.S) * u);
    const px = lerp(m.target.x, 0, u);
    const py = lerp(m.target.y, 0, u);
    if (cam) cam.setAttribute('transform', `translate(${px - m.target.x * s} ${py - m.target.y * s}) scale(${s})`);

    // Seamless dark handoff: once the ink covers the viewport, swap backgrounds.
    const covered = m.target.maxD * s >= Math.hypot(m.vw / 2, m.vh / 2) * 1.02;
    document.documentElement.dataset.navDark = covered ? 'true' : 'false';
    if (sticky) {
      sticky.style.backgroundColor = covered ? `rgb(${m.dark.r}, ${m.dark.g}, ${m.dark.b})` : '';
    }
    if (svg) svg.style.opacity = covered ? '0' : '1';
  }

  const showStaticWord = reduced || !ready;

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={reduced ? undefined : { height: '480vh' }}
    >
      <div
        ref={stickyRef}
        className={
          reduced
            ? 'flex flex-col items-center justify-center py-24'
            : 'sticky top-0 flex h-svh items-center justify-center overflow-hidden'
        }
      >
        <div className="absolute top-24 z-30 flex flex-col items-center gap-2 px-4 text-center">
          <Eyebrow>Why choose sikatree</Eyebrow>
          <p className="text-small text-ink-muted">Tap a bubble. Scroll to bring them together.</p>
        </div>

        {!reduced && (
          <svg
            ref={svgRef}
            className="absolute inset-0 z-20 block h-full w-full"
            viewBox="0 0 1 1"
          >
            <g ref={camRef}>
              {debug && ready && (
                <circle
                  cx={metrics.current.target.x}
                  cy={metrics.current.target.y}
                  r={metrics.current.target.maxD}
                  fill="none"
                  stroke="red"
                  strokeWidth={1}
                />
              )}
              <text
                ref={textRef}
                x={0}
                y={0}
                textAnchor="middle"
                fontWeight={600}
                className="fill-dark"
                style={{ letterSpacing: '-0.03em' }}
              >
                {WORD.split('').map((ch, i) => (
                  <tspan
                    key={i}
                    ref={(el) => {
                      letterRefs.current[i] = el;
                    }}
                    fillOpacity={0}
                    className="fill-dark"
                  >
                    {ch}
                  </tspan>
                ))}
              </text>
            </g>
          </svg>
        )}

        {showStaticWord && (
          <span className="relative z-20 font-sans text-[min(160px,18vw)] font-semibold lowercase tracking-[-0.03em] text-dark">
            sikatree
          </span>
        )}

        {!reduced &&
          FEATURES.map((feature, i) => {
            const isActive = active === i;
            return (
              <div
                key={feature.title}
                ref={(el) => {
                  orbRefs.current[i] = el;
                }}
                className="absolute left-1/2 top-1/2 z-30"
                style={{ width: 112, height: 112, opacity: 1 }}
              >
                <button
                  ref={(el) => {
                    orbBtnRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setActive(isActive ? null : i)}
                  aria-expanded={isActive}
                  className={cn(
                    'flex h-full w-full flex-col items-center justify-center rounded-full border text-center transition-colors duration-300',
                    isActive
                      ? 'border-green-main bg-mint-100 text-green-deep'
                      : 'border-hairline bg-white text-ink',
                  )}
                >
                  <span className="px-2 font-medium leading-tight" style={{ fontSize: 13 }}>
                    {feature.title}
                  </span>
                  {isActive && (
                    <span className="animate-fade-in mt-1 px-2 text-[12px] leading-snug text-ink-muted">
                      {feature.desc}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}
