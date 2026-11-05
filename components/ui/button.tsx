import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'inverse' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center rounded-pill text-label leading-none transition-transform duration-150 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-deep focus-visible:ring-offset-2';

const sizes: Record<Variant, string> = {
  primary: 'h-12 px-7',
  inverse: 'h-12 px-7',
  secondary: 'h-12 px-7 border border-hairline bg-white',
  ghost: 'h-11 px-4',
};

const variants: Record<Variant, string> = {
  primary: 'bg-green-main text-ink',
  inverse: 'bg-white text-ink',
  secondary: 'text-ink',
  ghost: 'text-ink hover:underline',
};

type ButtonProps = {
  href?: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ href, variant = 'primary', className, children, ...props }: ButtonProps) {
  const cls = cn(base, sizes[variant], variants[variant], className);

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
