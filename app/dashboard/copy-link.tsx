'use client';

import { useState } from 'react';
import { Copy } from '@/components/icons';
import { useToast } from '@/components/system/toast';

export function CopyLink({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Long-press the link to copy it.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline px-3 text-small text-ink transition-colors hover:border-ink/40"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? 'Copied' : label}
    </button>
  );
}
