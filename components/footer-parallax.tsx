'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, AtSign, Globe } from '@/components/icons';
import { Accent } from '@/components/ui/accent';
import { OstraMark } from '@/components/ui/ostra-mark';
import { site } from '@/lib/brand';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

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

export function FooterParallax() {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGTextElement>(null);

  const metrics = useRef({
    vw: 1,
    vh: 1,
    target: { x: 0, y: 0, maxD: 1 },
    S: 1,
    done: false,
  });

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
    // Pull the wordmark up from the vertical centre so it sits closer to the
    // footer links above it. The zoom still targets the glyph core.
    svg.setAttribute('viewBox', `${-vw / 2} ${-vh / 2 + vh * 0.26} ${vw} ${vh}`);

    const size = Math.min(160, Math.max(96, vw * 0.18));
    text.style.fontSize = `${size}px`;
    const cs = getComputedStyle(text);
    const ctxFont = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const c2 = document.createElement('canvas').getContext('2d');
    if (!c2) return;
    c2.font = ctxFont;
    const xHeight = c2.measureText('x').actualBoundingBoxAscent || size * 0.5;
    const baselineY = xHeight / 2;
    text.setAttribute('y', String(baselineY));

    const core = findGlyphCore(ctxFont, size);
    let glyphOriginX = 0;
    try {
      glyphOriginX = text.getExtentOfChar(7).x;
    } catch {
      glyphOriginX = 0;
    }
    m.target = { x: glyphOriginX + core.dx, y: baselineY + core.dy, maxD: core.maxD };
    m.S = (Math.hypot(vw / 2, vh / 2) / m.target.maxD) * 1.25;
    setReady(true);
  };

  useEffect(() => {
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

  useEffect(() => {
    if (!ready || reduced) return;
    let raf = 0;
    let resizeTimer = 0;
    const draw = (p: number) => {
      const m = metrics.current;
      const cam = camRef.current;
      const sticky = stickyRef.current;
      const u = easeInOutSine(clamp01((p - 0.1) / 0.9));
      const s = Math.exp(Math.log(m.S) * u);
      const px = lerp(m.target.x, 0, u);
      const py = lerp(m.target.y, 0, u);
      if (cam) cam.setAttribute('transform', `translate(${px - m.target.x * s} ${py - m.target.y * s}) scale(${s})`);

      const covered = m.target.maxD * s >= Math.hypot(m.vw / 2, m.vh / 2) * 1.02;
      if (covered) {
        if (sticky) sticky.style.backgroundColor = 'var(--bg-page)';
        document.documentElement.dataset.navDark = 'false';
        if (!m.done) {
          m.done = true;
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      } else {
        if (sticky) sticky.style.backgroundColor = '';
        m.done = false;
      }
    };
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

  return (
    <footer className="bg-dark">
      <div className="mx-auto max-w-[1120px] px-5 pt-10 sm:pt-12">
        <h2 className="max-w-2xl text-h2 text-white sm:text-h2-lg">
          Your shop is one <Accent>photo</Accent> away.
        </h2>

        <div className="mt-12 grid gap-8 border-t border-hairline-dark pt-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-label text-white">WhatsApp</p>
            <a
              href="https://wa.me/"
              className="mt-2 inline-flex items-center gap-2 text-small text-ink-on-dark-muted hover:text-white"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>
          <div>
            <p className="text-label text-white">Email</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-2 block text-small text-ink-on-dark-muted hover:text-white"
            >
              {site.email}
            </a>
          </div>
          <div>
            <p className="text-label text-white">Social</p>
            <div className="mt-2 flex gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-dark text-white/80">
                <AtSign className="h-5 w-5" />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-dark text-white/80">
                <Globe className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div>
            <p className="text-label text-white">Menu</p>
            <div className="mt-2 flex flex-col gap-1 text-small text-ink-on-dark-muted">
              <a href="#how-it-works" className="hover:text-white">How it works</a>
              <a href="#sample-stores" className="hover:text-white">Made for</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2.5 text-small text-ink-on-dark-muted">
            <OstraMark className="h-7 w-7" />
            <span>powered by Ostra</span>
          </div>
          <div className="flex items-center gap-6 text-small text-ink-on-dark-muted">
            <span>&copy; 2026 sikatree</span>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>

      {/* Infinite-scroll zoom: scales into the "e" and loops back to the top. */}
      <div ref={sectionRef} className="relative" style={reduced ? undefined : { height: '180vh' }}>
        <div
          ref={stickyRef}
          className={reduced ? 'flex justify-center py-16' : 'sticky top-0 h-svh overflow-hidden'}
        >
          {!reduced && (
            <svg ref={svgRef} className="absolute inset-0 block h-full w-full" viewBox="0 0 1 1">
              <g ref={camRef}>
                <text
                  ref={textRef}
                  x={0}
                  y={0}
                  textAnchor="middle"
                  fontWeight={600}
                  className="fill-[var(--bg-page)]"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  sikatree
                </text>
              </g>
            </svg>
          )}
          {reduced && (
            <span className="font-sans text-[min(160px,22vw)] font-semibold lowercase tracking-[-0.05em] text-[var(--bg-page)]">
              sikatree
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
