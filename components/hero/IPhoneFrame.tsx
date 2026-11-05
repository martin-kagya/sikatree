'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SignalIcon, WifiIcon, BatteryIcon } from './icons';

function StatusBar({ light }: { light: boolean }) {
  return (
    <div className={cn('hp-status', light && 'is-light')} aria-hidden>
      <span className="hp-status-time">9:41</span>
      <span className="hp-status-icons">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

function DynamicIsland({ open }: { open: boolean }) {
  return <div className={cn('hp-island', open && 'is-wide')} aria-hidden />;
}

function HomeIndicator() {
  return <div className="hp-home" aria-hidden />;
}

function DebugOverlay() {
  return (
    <div className="hp-debug" aria-hidden>
      <span className="hp-debug-line hp-debug-line-top" />
      <span className="hp-debug-label hp-debug-label-top">safe top · 59</span>
      <span className="hp-debug-line hp-debug-line-bottom" />
      <span className="hp-debug-label hp-debug-label-bottom">safe bottom · 34</span>
      <span className="hp-debug-island" />
      <span className="hp-debug-label hp-debug-label-island">island · 126×37</span>
    </div>
  );
}

export function IPhoneFrame({
  children,
  statusLight,
  islandOpen,
  debug = false,
}: {
  children: ReactNode;
  statusLight: boolean;
  islandOpen: boolean;
  debug?: boolean;
}) {
  return (
    <div className="hp-device" aria-hidden>
      {/* Side hardware (decorative, below the frame). */}
      <span className="hp-side-btn hp-side-action" />
      <span className="hp-side-btn hp-side-vol-up" />
      <span className="hp-side-btn hp-side-vol-down" />
      <span className="hp-side-btn hp-side-power" />

      <div className="hp-bezel">
        <div className="hp-display">
          {children}

          <StatusBar light={statusLight} />
          <DynamicIsland open={islandOpen} />
          <HomeIndicator />
          {debug && <DebugOverlay />}
        </div>
      </div>
    </div>
  );
}
