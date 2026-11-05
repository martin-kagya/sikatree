// Ghana mobile numbers: MTN / Telecel / AirtelTigo.
// Accepts 024..., 054..., +23324..., 23324..., 0023324... and normalizes to E.164.
export function normalizeGhanaPhone(raw: string): string | null {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00233')) digits = digits.slice(5);
  else if (digits.startsWith('233')) digits = digits.slice(3);

  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length === 9 && /^[25]\d{8}$/.test(digits)) return `+233${digits}`;
  return null;
}

// +233241234567 -> 024 123 4567
export function formatGhanaPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  const national = digits.startsWith('233') ? digits.slice(3) : digits;
  return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}
