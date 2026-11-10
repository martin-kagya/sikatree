import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        dark: 'var(--bg-dark)',
        sage: 'var(--sage)',
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          'on-dark': 'var(--ink-on-dark)',
          'on-dark-muted': 'var(--ink-on-dark-muted)',
        },
        green: {
          main: 'var(--green-main)',
          deep: 'var(--green-deep)',
          mark: 'var(--green-mark)',
        },
        mint: {
          100: 'var(--mint-100)',
        },
        warn: {
          bg: 'var(--warn-bg)',
          edge: 'var(--warn-edge)',
          text: 'var(--warn-text)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
          strong: 'var(--danger-bg-strong)',
        },
        hairline: 'var(--hairline)',
        'hairline-dark': 'var(--hairline-dark)',
        'surface-soft': 'var(--surface-soft)',
        'surface-dark': 'var(--surface-dark)',
      },
      fontFamily: {
        sans: ['var(--font-inter-tight)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        display: ['40px', { lineHeight: '42px', letterSpacing: '-0.04em', fontWeight: '500' }],
        'display-lg': ['64px', { lineHeight: '64px', letterSpacing: '-0.04em', fontWeight: '500' }],
        statement: ['26px', { lineHeight: '32px', letterSpacing: '-0.035em', fontWeight: '500' }],
        'statement-lg': ['44px', { lineHeight: '48px', letterSpacing: '-0.035em', fontWeight: '500' }],
        h1: ['32px', { lineHeight: '36px', letterSpacing: '-0.035em', fontWeight: '500' }],
        'h1-lg': ['48px', { lineHeight: '52px', letterSpacing: '-0.035em', fontWeight: '500' }],
        h2: ['28px', { lineHeight: '32px', letterSpacing: '-0.03em', fontWeight: '500' }],
        'h2-lg': ['36px', { lineHeight: '40px', letterSpacing: '-0.03em', fontWeight: '500' }],
        h3: ['18px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'h3-lg': ['20px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '500' }],
        lead: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'lead-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        small: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        label: ['15px', { lineHeight: '20px', fontWeight: '500' }],
        stat: ['36px', { lineHeight: '40px', letterSpacing: '-0.03em', fontWeight: '500' }],
        'stat-lg': ['44px', { lineHeight: '48px', letterSpacing: '-0.03em', fontWeight: '500' }],
      },
      borderRadius: {
        pill: '999px',
        panel: '32px',
        tile: '28px',
        card: '24px',
        inner: '16px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(16, 17, 31, 0.06)',
        float: '0 12px 32px rgba(16, 17, 31, 0.10)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
