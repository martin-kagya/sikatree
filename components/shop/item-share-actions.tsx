'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, MessageCircle, Share2 } from '@/components/icons';

export function ItemShareActions({ url, text }: { url: string; text: string }) {
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

  async function copy() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];

    try {
      await navigator.clipboard.writeText(url);
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
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        /* unsupported; fall through to copy */
      }
    }
    await copy();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-hairline bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-hairline bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied ? 'Link copied' : failedLabel ? 'Copy failed' : 'Copy link'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-hairline bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
      </div>
      {failed ? (
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Copy link value"
          spellCheck={false}
          className="mt-2 h-9 w-full max-w-[420px] rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
