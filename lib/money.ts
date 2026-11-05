// Money is integer pesewas everywhere (PLAN.md 6.1). Format at the edge only.
export function formatCedis(pesewas: number): string {
  return `GH₵${(pesewas / 100).toFixed(2)}`;
}

export function parsePesewas(raw: string): number | null {
  const value = Math.round(Number(raw.replace(/,/g, '.')) * 100);
  return Number.isFinite(value) ? value : null;
}
