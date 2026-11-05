import { clsx, type ClassValue } from 'clsx';

// Class names are authored so variants never overlap (one size, one colour per
// component). tailwind-merge cost 8.5 kB gzipped for conflict resolution this
// design does not need, so plain clsx is enough. If a component ever overrides
// another's utility of the same group, resolve it at the call site instead.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
