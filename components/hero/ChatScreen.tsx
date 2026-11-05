'use client';

import { cn } from '@/lib/utils';
import { stepAtLeast, type Step } from './useTimeline';
import { type Vertical } from './hero-demo-data';
import { PhotoGlyph, LinkGlyph, SendGlyph } from './icons';

export function ChatScreen({ step, vertical }: { step: Step; vertical: Vertical }) {
  const showText = stepAtLeast(step, 'chat_text');
  const showTyping = step === 'chat_typing';
  const showReply = stepAtLeast(step, 'chat_reply');

  return (
    <div className="hp-chat">
      <div className="hp-chat-header">
        <div className="hp-chat-avatar" aria-hidden>
          s
        </div>
        <div className="hp-chat-head-text">
          <p className="hp-chat-name">sikatree</p>
          <p className="hp-chat-status">online</p>
        </div>
      </div>

      <div className="hp-chat-body">
        <div className="hp-msg-row-photos">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="hp-photo"
              style={{ background: vertical.items[i % vertical.items.length].tint }}
            >
              <PhotoGlyph className="hp-photo-glyph" />
            </div>
          ))}
        </div>

        <div className={cn('hp-msg hp-msg-out hp-bubble-text', showText && 'is-on')}>
          {vertical.message.split('').map((ch, i) => (
            <span
              key={i}
              className="hp-char"
              style={{ transitionDelay: `${140 + i * 26}ms` }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
          {step === 'chat_text' && <span className="hp-caret" aria-hidden />}
        </div>

        <div className={cn('hp-msg hp-msg-in hp-typing', showTyping && 'is-on')}>
          <span className="hp-typing-dot" />
          <span className="hp-typing-dot" />
          <span className="hp-typing-dot" />
        </div>

        <div className={cn('hp-msg hp-msg-in hp-reply', showReply && 'is-on')}>
          <p className="hp-reply-text">Your shop is live.</p>
          <span className="hp-link-chip">
            <span className="hp-ripple" aria-hidden />
            <LinkGlyph className="hp-link-glyph" />
            sikatree/{vertical.slug}
          </span>
        </div>
      </div>

      <div className="hp-chat-input" aria-hidden>
        <div className="hp-input-field">Message</div>
        <div className="hp-input-send">
          <SendGlyph />
        </div>
      </div>
    </div>
  );
}
