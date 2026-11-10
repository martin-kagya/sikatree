'use client';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react';
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

const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      opacity: { duration: 0.22, ease: 'easeOut' },
      y: { type: 'spring' as const, stiffness: 320, damping: 26 },
      scale: { type: 'spring' as const, stiffness: 320, damping: 26 },
      filter: { duration: 0.3, ease: 'easeOut' },
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.97,
    filter: 'blur(4px)',
    transition: { duration: 0.18, ease: EASE_IN },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 4, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 340,
      damping: 22,
      delay: 0.06,
    },
  },
  exit: {
    scale: 0.6,
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

const reducedContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

const reducedChildVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? noop;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const reduceMotion = useReducedMotion();
  const child = reduceMotion ? reducedChildVariants : childVariants;
  const icon = reduceMotion ? reducedChildVariants : iconVariants;

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused || documentHidden) return;
    const duration = item.variant === 'error' ? 6000 : 4000;
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
        'pointer-events-auto flex w-full max-w-[420px] items-start gap-2.5 rounded-[16px] border px-4 py-3 shadow-card',
        item.variant === 'error'
          ? 'border-danger/20 bg-danger-bg text-danger'
          : 'border-green-main/30 bg-mint-100 text-green-deep',
      )}
      exit="exit"
      initial="hidden"
      onBlurCapture={handleBlur}
      onFocusCapture={() => setPaused(true)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      role={item.variant === 'error' ? 'alert' : 'status'}
      variants={reduceMotion ? reducedContainerVariants : containerVariants}
    >
      <motion.span className="mt-0.5 shrink-0" variants={icon}>
        {item.variant === 'error' ? (
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Check className="h-4 w-4" aria-hidden="true" />
        )}
      </motion.span>
      <motion.p className="min-w-0 flex-1 text-[13px] leading-snug" variants={child}>
        {item.message}
      </motion.p>
      <motion.button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-deep"
        variants={child}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, variant: Variant) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((current) => [...current.slice(-2), { id, message, variant }]);
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
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-40 z-[95] flex flex-col items-center gap-2 px-4 sm:bottom-20"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard
              key={item.id}
              item={item}
              onDismiss={() => setItems((current) => current.filter((next) => next.id !== item.id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
