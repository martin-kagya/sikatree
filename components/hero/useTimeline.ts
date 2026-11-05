'use client';

import { useEffect, useRef } from 'react';

export type Step =
  | 'chat_photos'
  | 'chat_text'
  | 'chat_typing'
  | 'chat_reply'
  | 'tap'
  | 'shop_in'
  | 'pay'
  | 'paid'
  | 'toast'
  | 'reset';

export type TimelineStep = {
  at: number;
  run: () => void;
};

export const STEP_ORDER: Step[] = [
  'chat_photos',
  'chat_text',
  'chat_typing',
  'chat_reply',
  'tap',
  'shop_in',
  'pay',
  'paid',
  'toast',
  'reset',
];

export function stepIndex(step: Step): number {
  return STEP_ORDER.indexOf(step);
}

export function stepAtLeast(step: Step, min: Step): boolean {
  return stepIndex(step) >= stepIndex(min);
}

/**
 * One small timeline: an ordered list of { at, run } actions scheduled from a
 * single start time via requestAnimationFrame comparing performance.now().
 * Pausing shifts the start time forward each paused frame, so resuming is exact.
 */
export function useTimeline(steps: TimelineStep[], options: { paused: boolean }): void {
  const stepsRef = useRef(steps);
  const pausedRef = useRef(options.paused);

  useEffect(() => {
    stepsRef.current = steps;
  });

  useEffect(() => {
    pausedRef.current = options.paused;
  }, [options.paused]);

  useEffect(() => {
    let start = performance.now();
    let index = 0;
    let pausedAt: number | null = null;
    let raf = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      if (pausedRef.current) {
        if (pausedAt === null) pausedAt = now;
        start += now - pausedAt;
        pausedAt = now;
        return;
      }

      pausedAt = null;
      const elapsed = now - start;
      const list = stepsRef.current;

      while (index < list.length && list[index].at * 1000 <= elapsed) {
        list[index].run();
        index += 1;
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
