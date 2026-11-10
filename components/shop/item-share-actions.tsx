'use client';

import { useState } from 'react';
import { Copy, MessageCircle, Share2 } from '@/components/icons';

export function ItemShareActions({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        /* cancelled or unsupported; fall through to copy */
      }
    }
    await copy();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
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
        {copied ? 'Link copied' : 'Copy link'}
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
  );
}
