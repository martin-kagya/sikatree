'use client';

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, X } from '@/components/icons';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'error';

type ToastItem = {
  id: number;
  message: string;
  variant: Variant;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const noop: ToastApi = { success: () => undefined, error: () => undefined };

const motionVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } },
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? noop;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused || documentHidden) return;
    const duration = item.variant === 'error' ? 6000 : 3000;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [documentHidden, item.variant, onDismiss, paused]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setPaused(false);
  };

  return (
    <motion.div
      animate="visible"
      aria-atomic="true"
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-2.5 rounded-[14px] border px-4 py-3 shadow-card',
        item.variant === 'error'
          ? 'border-danger/40 bg-danger-strong text-danger'
          : 'border-green-deep/30 bg-mint-100 text-green-deep',
      )}
      exit="exit"
      initial="hidden"
      onBlurCapture={handleBlur}
      onFocusCapture={() => setPaused(true)}
      onPointerCancel={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerUp={() => setPaused(false)}
      role={item.variant === 'error' ? 'alert' : 'status'}
      variants={reduceMotion ? reducedVariants : motionVariants}
    >
      <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
        {item.variant === 'error' ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </span>
      <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-deep"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const viewport = document.getElementById('toast-viewport');
    if (!viewport) return;
    setTarget(viewport);

    const anchor = document.querySelector<HTMLElement>('[data-toast-anchor]');
    if (!anchor || anchor.offsetHeight === 0) return;

    const update = () => {
      const bottom = anchor.getBoundingClientRect().bottom;
      viewport.style.top = `${Math.max(8, Math.round(bottom + 8))}px`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    window.addEventListener('resize', update);

    return () => {
      viewport.style.top = '';
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const push = useCallback((message: string, variant: Variant) => {
    nextId.current += 1;
    setItem({ id: nextId.current, message, variant });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {target
        ? createPortal(
            <AnimatePresence initial={false} mode="wait">
              {item ? (
                <ToastCard
                  key={item.id}
                  item={item}
                  onDismiss={() =>
                    setItem((current) => (current?.id === item.id ? null : current))
                  }
                />
              ) : null}
            </AnimatePresence>,
            target,
          )
        : null}
    </ToastContext.Provider>
  );
}
