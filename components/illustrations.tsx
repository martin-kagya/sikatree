import type { ReactNode } from 'react';
import { Check } from '@/components/icons';
import { cn } from '@/lib/utils';

function IllustrationFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="m-0" role="img" aria-label={`Example: ${label}`}>
      {children}
    </figure>
  );
}

export function ChatIllustration() {
  return (
    <IllustrationFrame label="Sending a photo and price on WhatsApp, confirming the item, and going live">
      <div className="space-y-2 text-[11px] leading-tight">
        <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-mint-100 px-3 py-2">
          <p className="font-medium text-ink">Blue heels, 250</p>
          <p className="mt-1 text-right text-[9px] text-ink-muted">12:04</p>
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3 py-2">
          <p className="text-ink">Here is what I got:</p>
          <p className="mt-1.5 font-medium text-ink">Blue heels</p>
          <p className="font-medium text-green-deep">GH₵250.00</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-pill bg-green-main px-2.5 py-1 text-[9px] font-medium text-ink">
              Confirm
            </span>
            <span className="rounded-pill border border-hairline px-2.5 py-1 text-[9px] font-medium text-ink">
              Edit
            </span>
          </div>
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3 py-2">
          <p className="text-ink">Added. You are live at</p>
          <p className="mt-0.5 font-medium text-green-deep">/amasglow</p>
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function StorefrontIllustration() {
  return (
    <IllustrationFrame label="A vendor storefront page with a catalogue and prices">
      <div className="space-y-2 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-100 text-[9px] font-semibold text-green-deep">
            AG
          </div>
          <div>
            <p className="font-medium text-ink">Ama's Glow</p>
            <p className="text-[9px] text-ink-muted">Skincare, Kumasi</p>
          </div>
        </div>
        <div className="rounded-pill border border-hairline px-3 py-1.5 text-[10px] text-ink">
          View catalogue
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Serum', price: 'GH₵120' },
            { name: 'Cream', price: 'GH₵95' },
          ].map((p) => (
            <div key={p.name} className="rounded-[12px] bg-white p-1.5">
              <div className="aspect-square rounded-[8px] bg-page" />
              <p className="mt-1 text-[9px] font-medium text-ink">{p.name}</p>
              <p className="text-[9px] text-ink-muted">{p.price}</p>
            </div>
          ))}
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function MomoPromptIllustration() {
  return (
    <IllustrationFrame label="A Mobile Money approval prompt">
      <div className="rounded-2xl bg-white p-3 text-[11px]">
        <p className="text-[9px] font-medium text-ink-muted">MTN MoMo</p>
        <p className="mt-1 text-[18px] font-semibold text-ink">GH₵255.00</p>
        <p className="mt-1 text-[9px] text-ink-muted">Approve the prompt on your phone to pay.</p>
        <div className="mt-2.5 rounded-pill bg-green-main px-3 py-1.5 text-center text-[10px] font-medium text-ink">
          Approve payment
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function OrderAlertIllustration() {
  return (
    <IllustrationFrame label="A new order alert on WhatsApp with an order code and action buttons">
      <div className="space-y-2 text-[11px] leading-tight">
        <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2">
          <p className="font-medium text-ink">New order ORD-4F9K</p>
          <p className="mt-1 text-ink">2 x Blue heels</p>
          <p className="text-ink-muted">Buyer: Kofi A.</p>
          <p className="mt-1 font-medium text-green-deep">GH₵500.00 paid</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-pill bg-green-main px-2 py-1 text-[9px] font-medium text-ink">
              Confirm
            </span>
            <span className="rounded-pill border border-hairline px-2 py-1 text-[9px] font-medium text-ink">
              Contact buyer
            </span>
          </div>
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function FrustrationIllustration() {
  const questions = [
    'How much?',
    'Still available?',
    'I have paid',
    'How much?',
    'Do you deliver?',
    'Still available?',
    'I have paid',
    'How much?',
  ];

  return (
    <IllustrationFrame label="A seller answering the same questions again and again">
      <div className="mx-auto max-w-xl rounded-card bg-white p-8 text-center">
        <p className="text-small font-medium text-ink-muted">The same questions, all day</p>

        <p className="mt-6 text-[24px] font-medium tracking-[-0.02em] text-ink sm:text-[30px]">
          How much?
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {questions.map((question, i) => (
            <span
              key={i}
              className={cn(
                'rounded-pill border px-4 py-2 text-label',
                question === 'How much?'
                  ? 'border-green-main bg-mint-100 text-green-deep'
                  : 'border-hairline bg-white text-ink-muted',
              )}
            >
              {question}
            </span>
          ))}
        </div>
      </div>
    </IllustrationFrame>
  );
}

export function OrderTrackingIllustration() {
  const steps = ['Order placed', 'Payment received', 'Confirmed by vendor', 'Ready or out for delivery'];

  return (
    <IllustrationFrame label="An order tracking stepper with completed steps">
      <div className="rounded-2xl bg-white p-3 text-[10px]">
        <p className="text-[9px] font-medium text-ink-muted">Order ORD-4F9K</p>
        <ol className="mt-2 space-y-1.5">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full',
                  i < 3 ? 'bg-ink text-white' : 'border border-hairline text-ink-muted',
                )}
              >
                {i < 3 ? <Check className="h-2.5 w-2.5" /> : null}
              </span>
              <span className={i < 3 ? 'text-ink' : 'text-ink-muted'}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </IllustrationFrame>
  );
}
