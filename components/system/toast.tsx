'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

// Context lives in a client module so any client component can report a result
// that is not already visible where the user is looking.

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? noop;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDismiss, 180);
  }, [leaving, onDismiss]);

  useEffect(() => {
    if (paused || leaving) return;
    const duration = item.variant === 'error' ? 6000 : 4000;
    timer.current = window.setTimeout(close, duration);
    return () => window.clearTimeout(timer.current);
  }, [close, item.variant, leaving, paused]);

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-[420px] items-start gap-2.5 rounded-[16px] border px-4 py-3 shadow-card transition-all duration-200 ease-[var(--ease-standard)]',
        item.variant === 'error'
          ? 'border-danger/20 bg-danger-bg text-danger'
          : 'border-green-main/30 bg-mint-100 text-green-deep',
        leaving ? 'translate-y-1 opacity-0' : 'feedback-rise translate-y-0 opacity-100',
      )}
    >
      {item.variant === 'error' ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <p className="min-w-0 flex-1 text-[13px] leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
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
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => setItems((current) => current.filter((next) => next.id !== item.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
