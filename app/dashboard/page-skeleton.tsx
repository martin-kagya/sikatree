// Shared loading skeleton. The dashboard shell (header + menu) stays put above
// it, so navigating never looks frozen.
export function PageSkeleton() {
  return (
    <main className="mt-6 space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-28 animate-pulse rounded-panel bg-white/80 shadow-card" />
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-[20px] bg-white shadow-card" />
        <div className="h-24 animate-pulse rounded-[20px] bg-white shadow-card" />
        <div className="h-20 animate-pulse rounded-[20px] bg-white/70 shadow-card" />
      </div>
    </main>
  );
}
