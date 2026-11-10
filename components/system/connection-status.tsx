// Inline connection status: no React chunk, no hydration cost. The markup is
// server-rendered and a few lines of vanilla JS toggle it on the online and
// offline events. This keeps the feedback contract on every page, including the
// static landing page, without adding to the JS budget.
const SCRIPT = `(function(){
  var el = document.getElementById('connection-status');
  if (!el) return;
  var dot = document.getElementById('connection-dot');
  var copy = document.getElementById('connection-copy');
  var timer;
  function show(offline) {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.pointerEvents = 'auto';
    el.setAttribute('aria-hidden', 'false');
    if (dot) dot.style.background = offline ? 'var(--warn-edge)' : 'var(--green-main)';
    if (copy) copy.textContent = offline
      ? "You're offline. Changes won't save until you reconnect."
      : 'Back online.';
  }
  function hide() {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden', 'true');
  }
  function update() {
    if (!navigator.onLine) {
      window.clearTimeout(timer);
      show(true);
      return;
    }
    show(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, 3000);
  }
  window.addEventListener('offline', update);
  window.addEventListener('online', update);
  if (!navigator.onLine) show(true);
})();`;

export function ConnectionStatus() {
  return (
    <>
      <div
        id="connection-status"
        role="status"
        aria-live="polite"
        aria-hidden="true"
        style={{ opacity: 0, transform: 'translateY(8px)', pointerEvents: 'none' }}
        className="fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 transition-all duration-200 ease-[var(--ease-standard)] sm:bottom-6"
      >
        <div className="flex min-h-[44px] items-center gap-2.5 rounded-pill bg-ink px-4 py-2 text-[13px] text-white shadow-card">
          <span
            id="connection-dot"
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-green-main"
          />
          <span id="connection-copy">Back online.</span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
