'use client';

import { cn } from '@/lib/utils';
import { toastText, type Vertical } from './hero-demo-data';
import { type Step } from './useTimeline';
import { ChatBubbleGlyph } from './icons';

export function OrderToast({ step, vertical }: { step: Step; vertical: Vertical }) {
  const active = step === 'toast';

  return (
    <div className={cn('hp-toast', active && 'is-active')} aria-hidden>
      <div className="hp-toast-icon">
        <ChatBubbleGlyph />
      </div>
      <div className="hp-toast-text">
        <p className="hp-toast-title">sikatree</p>
        <p className="hp-toast-body">{toastText(vertical)}</p>
      </div>
    </div>
  );
}
