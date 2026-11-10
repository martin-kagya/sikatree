'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy } from '@/components/icons';

export function CopyLink({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedLabel, setFailedLabel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    if (!failed) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [failed]);

  const copy = async () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      setFailedLabel(false);
      timers.current.push(window.setTimeout(() => setCopied(false), 2000));
    } catch {
      setCopied(false);
      setFailed(true);
      setFailedLabel(true);
      timers.current.push(window.setTimeout(() => setFailedLabel(false), 2000));
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline px-3 text-small text-ink transition-colors hover:border-ink/40"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copied' : failedLabel ? 'Copy failed' : label}
      </button>
      {failed ? (
        <input
          ref={inputRef}
          readOnly
          value={value}
          aria-label="Copy value manually"
          spellCheck={false}
          className="h-8 w-full min-w-[160px] max-w-[280px] rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
