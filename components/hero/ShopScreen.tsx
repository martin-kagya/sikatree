'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BOOKING_TIMES,
  SHOW_BOOKINGS,
  initials,
  paidLabel,
  type Vertical,
  type VerticalItem,
} from './hero-demo-data';
import { stepAtLeast, type Step } from './useTimeline';
import { CheckGlyph, CalendarGlyph } from './icons';

// The demo tiles use their tint and initial, so the hero never waits on a
// photo and there are no missing-image requests on first load.
function ProductImage({ item }: { item: VerticalItem }) {
  return (
    <div className="hp-tile-img" style={{ background: item.tint }}>
      <span className="hp-tile-letter" aria-hidden>
        {item.name[0]}
      </span>
    </div>
  );
}

export function ProductTile({
  item,
  delay,
  on,
}: {
  item: VerticalItem;
  delay: number;
  on: boolean;
}) {
  return (
    <div className={cn('hp-tile', on && 'is-on')} style={{ transitionDelay: `${delay}ms` }}>
      <ProductImage item={item} />
      <p className="hp-tile-name">{item.name}</p>
      <p className="hp-tile-price">{item.price}</p>
    </div>
  );
}

export function ShopHeader({ vertical }: { vertical: Vertical }) {
  return (
    <div className="hp-shop-header">
      <div className="hp-shop-avatar" aria-hidden>
        {initials(vertical.shopName)}
      </div>
      <div>
        <p className="hp-shop-name">{vertical.shopName}</p>
        <p className="hp-shop-subtitle">{vertical.subtitle}</p>
      </div>
    </div>
  );
}

export function BookingChips({ on }: { on: boolean }) {
  return (
    <div className={cn('hp-booking-chips', on && 'is-on')} style={{ transitionDelay: '260ms' }}>
      {BOOKING_TIMES.map((time) => (
        <span key={time} className="hp-chip">
          <CalendarGlyph className="hp-chip-glyph" />
          {time}
        </span>
      ))}
    </div>
  );
}

export function PayButton({
  vertical,
  pressed,
  paid,
}: {
  vertical: Vertical;
  pressed: boolean;
  paid: boolean;
}) {
  return (
    <div className="hp-pay-wrap">
      <button
        type="button"
        tabIndex={-1}
        className={cn('hp-pay', pressed && 'is-pressed', paid && 'is-paid')}
      >
        <span className="hp-pay-label hp-pay-cta">{vertical.cta}</span>
        <span className="hp-pay-label hp-pay-done">
          <CheckGlyph />
          {paidLabel(vertical)}
        </span>
      </button>
    </div>
  );
}

export function ShopScreen({ step, vertical }: { step: Step; vertical: Vertical }) {
  const tilesOn = stepAtLeast(step, 'shop_in');
  const pressed = step === 'pay';
  const paid = stepAtLeast(step, 'paid');
  const showBooking = vertical.kind === 'booking' && SHOW_BOOKINGS;

  return (
    <div className="hp-shop">
      <ShopHeader vertical={vertical} />

      <div className="hp-shop-body">
        <div className="hp-tiles">
          {vertical.items.map((item, i) => (
            <ProductTile key={item.name} item={item} delay={i * 120} on={tilesOn} />
          ))}
        </div>

        {showBooking && <BookingChips on={tilesOn} />}
      </div>

      <PayButton vertical={vertical} pressed={pressed} paid={paid} />
    </div>
  );
}
