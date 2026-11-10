import type { ReactNode } from 'react';
import Link from 'next/link';
import { ToastProvider } from '@/components/system/toast';
import { DashboardMenu } from './dashboard-menu';
import { NavProgress } from './nav-progress';

// Shared dashboard shell. Keeping the header here means it stays put while a
// page loads, so navigation shows the content skeleton instead of a blank freeze.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
        <NavProgress />
        <div className="mx-auto max-w-[960px]">
          <header className="flex items-center justify-between" data-toast-anchor>
            <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
              sikatree
            </Link>
            <DashboardMenu />
          </header>
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
