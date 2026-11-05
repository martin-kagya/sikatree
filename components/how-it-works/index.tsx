'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Accent } from '@/components/ui/accent';
import { SignalIcon, WifiIcon, BatteryIcon } from '@/components/hero/icons';
import { InboxScreen, ParseScreen, HiwShopScreen, OrderScreen } from './screens';
import { STEPS } from './data';
import './how-it-works.css';

const N = 4;
const T = 0.08;
const T2 = T / 2;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

function weight(i: number, p: number): number {
  const bStart = i / N;
  const bEnd = (i + 1) / N;
  const fadeIn = i === 0 ? 1 : smoothstep((p - bStart) / T2);
  const fadeOut = i === N - 1 ? 1 : 1 - smoothstep((p - (bEnd - T2)) / T2);
  return Math.min(fadeIn, fadeOut);
}

function computeWeights(p: number): number[] {
  return [0, 1, 2, 3].map((i) => weight(i, p));
}

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

const setW = (v: string): CSSProperties => ({ '--w': v } as CSSProperties);

function StatusBar() {
  return (
    <div className="hiw-status" aria-hidden>
      <span className="hiw-status-time">9:41</span>
      <span className="hiw-status-icons">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

function PhoneStage({
  screenRefs,
  phoneFitRef,
  phoneRef,
}: {
  screenRefs: RefObject<(HTMLDivElement | null)[]>;
  phoneFitRef: RefObject<HTMLDivElement | null>;
  phoneRef: RefObject<HTMLDivElement | null>;
}) {
  const setScreenRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      screenRefs.current[i] = el;
    },
    [screenRefs],
  );

  return (
    <div className="hiw-phone-fit" ref={phoneFitRef}>
      <div className="hiw-phone" ref={phoneRef}>
        <div className="hiw-device" aria-hidden>
          <span className="hiw-side hiw-side--action" />
          <span className="hiw-side hiw-side--vol-up" />
          <span className="hiw-side hiw-side--vol-down" />
          <span className="hiw-side hiw-side--power" />

          <div className="hiw-bezel">
            <div className="hiw-display">
              <div className="hiw-screen" ref={setScreenRef(0)} style={setW('1')}>
                <InboxScreen />
              </div>
              <div className="hiw-screen" ref={setScreenRef(1)}>
                <ParseScreen />
              </div>
              <div className="hiw-screen" ref={setScreenRef(2)}>
                <HiwShopScreen />
              </div>
              <div className="hiw-screen" ref={setScreenRef(3)}>
                <OrderScreen />
              </div>

              <StatusBar />
              <div className="hiw-island" aria-hidden />
              <div className="hiw-home" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepList({
  activeStep,
  stepRefs,
}: {
  activeStep: number;
  stepRefs: RefObject<(HTMLLIElement | null)[]>;
}) {
  const setStepRef = useCallback(
    (i: number) => (el: HTMLLIElement | null) => {
      stepRefs.current[i] = el;
    },
    [stepRefs],
  );

  return (
    <ol className="hiw-steps">
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          ref={setStepRef(i)}
          className="hiw-step"
          aria-current={activeStep === i ? 'step' : undefined}
        >
          <span className="hiw-step-tag">{step.tag}</span>
          <h3 className="hiw-step-title">{step.title}</h3>
          <p className="hiw-step-body">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phoneFitRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const activeFlags = useRef([false, false, false, false]);
  const borderFlags = useRef([false, false, false, false]);
  const reducedRef = useRef(reduced);
  const touchingRef = useRef(false);
  const activeStepRef = useRef(0);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // Phone scale (ResizeObserver on the stage, not window resize alone).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const apply = () => {
      const narrow = window.innerWidth < 820;
      const s = Math.max(
        0.45,
        Math.min(1, (window.innerHeight - (narrow ? 250 : 150)) / 600, (window.innerWidth - 48) / 296),
      );
      if (phoneFitRef.current) phoneFitRef.current.style.setProperty('--s', String(s));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Scroll handler: one rAF-throttled pass that writes straight to refs.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    const render = () => {
      raf = 0;
      const p = clamp01(
        -track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - stage.offsetHeight),
      );
      const w = computeWeights(p);

      for (let i = 0; i < N; i++) {
        const screen = screenRefs.current[i];
        if (screen) {
          screen.style.setProperty('--w', w[i].toFixed(4));
          if (w[i] > 0.02 && !activeFlags.current[i]) {
            activeFlags.current[i] = true;
            screen.classList.add('is-active');
          } else if (w[i] === 0 && activeFlags.current[i]) {
            activeFlags.current[i] = false;
            screen.classList.remove('is-active');
          }
        }

        const step = stepRefs.current[i];
        if (step) {
          step.style.setProperty('--w', w[i].toFixed(4));
          const current = w[i] > 0.5;
          if (current !== borderFlags.current[i]) {
            borderFlags.current[i] = current;
            step.classList.toggle('is-current', current);
          }
        }
      }

      if (hintRef.current) hintRef.current.style.opacity = p > 0.03 ? '0' : '1';

      let maxW = 0;
      let maxI = activeStepRef.current;
      for (let i = 0; i < N; i++) {
        if (w[i] > maxW) {
          maxW = w[i];
          maxI = i;
        }
      }
      if (maxW > 0 && maxI !== activeStepRef.current) {
        activeStepRef.current = maxI;
        setActiveStep(maxI);
      }

      if (process.env.NODE_ENV !== 'production') {
        const count = w.filter((x) => x > 0).length;
        if (count > 1) console.warn('[HowItWorks] multiple states visible', w, 'p=', p);
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
  }, []);

  // Touch tracking so the backstop never fights a gesture.
  useEffect(() => {
    const onStart = () => {
      touchingRef.current = true;
    };
    const onEnd = () => {
      touchingRef.current = false;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  // Settle backstop after scrolling stops. Direction-aware so it never snaps
  // back against the way the user was scrolling. Uses a debounce (reliable
  // across browsers/input methods) rather than `scrollend`.
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    let dir = 1; // 1 = scrolling down/forward, -1 = up/backward
    let lastY = window.scrollY;
    let debounce = 0;

    const trackDirection = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) > 1) dir = dy > 0 ? 1 : -1;
      lastY = y;
    };

    const settle = () => {
      if (reducedRef.current || touchingRef.current) return;
      const D = track.offsetHeight - stage.offsetHeight;
      const p = clamp01(-track.getBoundingClientRect().top / Math.max(1, D));
      const w = computeWeights(p);
      if (!w.every((x) => x < 1 - 1e-6)) return; // already in a hold zone
      const k = Math.max(1, Math.min(N - 1, Math.round(p * N))); // nearest boundary
      const j = dir >= 0 ? k : k - 1; // continue in the user's direction, never reverse
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: trackTop + ((j + 0.5) / N) * D, behavior: 'smooth' });
    };

    const scheduleSettle = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(settle, 150);
    };

    window.addEventListener('scroll', trackDirection, { passive: true });
    window.addEventListener('scroll', scheduleSettle, { passive: true });

    return () => {
      window.removeEventListener('scroll', trackDirection);
      window.removeEventListener('scroll', scheduleSettle);
      window.clearTimeout(debounce);
    };
  }, []);

  return (
    <section id="how-it-works" className="scroll-mt-24">
      <div className="hiw-head">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="hiw-headline">
          From DM chaos to <Accent>checkout.</Accent>
        </h2>
      </div>

      <div ref={trackRef} className="hiw-track" style={{ height: '360vh' }}>
        <div ref={stageRef} className="hiw-stage">
          <div className="hiw-left">
            <StepList activeStep={activeStep} stepRefs={stepRefs} />
            <div ref={hintRef} className="hiw-hint" aria-hidden>
              Scroll to continue
              <span className="hiw-hint-bar" />
            </div>
          </div>
          <div className="hiw-right">
            <PhoneStage screenRefs={screenRefs} phoneFitRef={phoneFitRef} phoneRef={phoneRef} />
          </div>
        </div>
      </div>
    </section>
  );
}
