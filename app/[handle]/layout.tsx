import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/system/toast';

// Shop surfaces use toast feedback for share and copy actions.
export default function ShopLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
