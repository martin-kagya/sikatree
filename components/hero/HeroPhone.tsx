'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { IPhoneFrame } from './IPhoneFrame';
import { ChatScreen } from './ChatScreen';
import { ShopScreen } from './ShopScreen';
import { OrderToast } from './OrderToast';
import { VERTICALS, type Vertical } from './hero-demo-data';
import { useTimeline, type Step, type TimelineStep } from './useTimeline';
import { ReplayGlyph } from './icons';
import './hero-demo.css';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(callback: () => void) {
  const mql = window.matchMedia(REDUCED_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

const LIGHT_STATUS_STEPS: Step[] = [
  'chat_photos',
  'chat_text',
  'chat_typing',
  'chat_reply',
  'tap',
  'reset',
];

function VerticalDemo({
  vertical,
  paused,
  onDone,
  debug,
}: {
  vertical: Vertical;
  paused: boolean;
  onDone: () => void;
  debug: boolean;
}) {
  const [step, setStep] = useState<Step>('chat_photos');

  const steps: TimelineStep[] = [
    { at: 1.6, run: () => setStep('chat_text') },
    { at: 3.0, run: () => setStep('chat_typing') },
    { at: 3.9, run: () => setStep('chat_reply') },
    { at: 4.8, run: () => setStep('tap') },
    { at: 5.2, run: () => setStep('shop_in') },
    { at: 7.0, run: () => setStep('pay') },
    { at: 7.35, run: () => setStep('paid') },
    { at: 8.0, run: () => setStep('toast') },
    { at: 9.5, run: () => setStep('reset') },
    { at: 9.75, run: onDone },
  ];

  useTimeline(steps, { paused });

  const statusLight = LIGHT_STATUS_STEPS.includes(step);
  const islandOpen = step === 'toast';

  return (
    <IPhoneFrame statusLight={statusLight} islandOpen={islandOpen} debug={debug}>
      <div className="hp-screen" data-step={step}>
        <ChatScreen step={step} vertical={vertical} />
        <ShopScreen step={step} vertical={vertical} />
        <OrderToast step={step} vertical={vertical} />
      </div>
    </IPhoneFrame>
  );
}

export function HeroPhone() {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [cycle, setCycle] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'final'>('playing');
  const [offscreen, setOffscreen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [debug, setDebug] = useState(false);

  // Scale the whole device with a single CSS variable (--s).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => el.style.setProperty('--s', String(el.clientWidth / 411));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setDebug(window.location.search.includes('debug=1'));
  }, []);

  // Pause when the phone is offscreen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => setOffscreen(!entries[0].isIntersecting),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const vertical = VERTICALS[index];
  const paused = offscreen || hidden || hovered;

  const handleDone = useCallback(() => {
    setIndex((i) => {
      if (i >= VERTICALS.length - 1) {
        setPhase('final');
        return i;
      }
      return i + 1;
    });
  }, []);

  const replay = () => {
    setIndex(0);
    setCycle((c) => c + 1);
    setPhase('playing');
  };

  const showFinal = reduced || phase === 'final';

  return (
    <div className="hp-root">
      <p className="sr-only">
        A vendor sends product photos in a chat and receives a live shop link; a customer pays by
        mobile money and the vendor gets an order alert.
      </p>

      <div
        className="hp-wrap"
        ref={wrapRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <div className="hp-scale">
          {showFinal ? (
            <IPhoneFrame statusLight={false} islandOpen={false} debug={debug}>
              <div className="hp-screen" data-step="paid">
                <ChatScreen step="paid" vertical={VERTICALS[0]} />
                <ShopScreen step="paid" vertical={VERTICALS[0]} />
              </div>
            </IPhoneFrame>
          ) : (
            <VerticalDemo
              key={`${cycle}:${index}`}
              vertical={vertical}
              paused={paused}
              onDone={handleDone}
              debug={debug}
            />
          )}
        </div>
      </div>

      <div className="hp-under">
        <p className="hp-caption">Preview of your shop</p>
        <button type="button" className="hp-replay" onClick={replay}>
          <ReplayGlyph />
          Replay
        </button>
      </div>
    </div>
  );
}
