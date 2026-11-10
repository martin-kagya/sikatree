'use client';

import { useEffect } from 'react';

// Last-resort shell. If the root layout itself failed, the design system CSS may
// not be available, so this one surface uses inline styles on purpose.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] global error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#f4f4f2',
          color: '#111111',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#ffffff',
              borderRadius: 24,
              padding: 32,
              boxShadow: '0 20px 60px rgba(16, 17, 31, 0.08)',
            }}
          >
            <p style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.03em' }}>
              sikatree
            </p>
            <h1 style={{ margin: '24px 0 0', fontSize: 24, lineHeight: 1.2 }}>
              That didn&rsquo;t load.
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: '#5c5f66' }}>
              A problem stopped the app from starting. Nothing you entered was saved. Try again, or
              head back.
            </p>
            {error.digest ? (
              <p style={{ margin: '12px 0 0', fontSize: 11, color: '#8a8d94', fontFamily: 'monospace' }}>
                Reference: {error.digest}
              </p>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  height: 44,
                  borderRadius: 999,
                  border: 0,
                  background: '#b8f3d0',
                  color: '#111111',
                  padding: '0 22px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  height: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  border: '1px solid #e5e5e2',
                  color: '#111111',
                  padding: '0 22px',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Back to sikatree
              </a>
            </div>
            <p style={{ margin: '20px 0 0', fontSize: 11, lineHeight: 1.6, color: '#8a8d94' }}>
              Still stuck? Email hello@sikatree.africa with the reference above.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
