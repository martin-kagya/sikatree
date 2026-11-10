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
        'pointer-events-auto relative flex min-h-12 w-full items-center gap-2.5 rounded-[14px] border px-4 py-3',
        'shadow-[0_8px_24px_rgba(0,0,0,0.10)]',
        item.variant === 'error'
          ? 'border-danger-edge bg-danger-strong pr-12'
          : 'border-mint-edge bg-mint-100',
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
      <span
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white',
          item.variant === 'error' ? 'bg-danger-icon' : 'bg-green-main',
        )}
        aria-hidden="true"
      >
        {item.variant === 'error' ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </span>
      <p
        className={cn(
          'line-clamp-2 min-w-0 flex-1 text-[15px] font-medium leading-5',
          item.variant === 'error' ? 'text-danger' : 'text-green-deep',
        )}
      >
        {item.message}
      </p>
      {item.variant === 'error' ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-deep"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
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
