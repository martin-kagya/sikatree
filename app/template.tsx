import type { ReactNode } from 'react';

// App Router remounts a template on navigation, so this short opacity fade
// runs on every page change without a transform that would break fixed layers.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
