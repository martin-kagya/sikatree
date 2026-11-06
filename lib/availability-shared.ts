// Pure availability helpers. Kept free of any database import so client
// components can use the labels and formatting too.

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const SLOT_MINUTES_OPTIONS = [30, 45, 60, 90, 120] as const;

export type AvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type AvailabilityState = {
  windows: AvailabilityWindow[];
  blockedDates: string[];
  slotMinutes: number;
  weeklyCap: number | null;
};

export type AvailabilityInput = {
  windows: AvailabilityWindow[];
  blockedDates: string[];
  slotMinutes: number;
  weeklyCap: number | null;
};

export type SaveAvailabilityResult = { ok: true } | { ok: false; error: string };

export type SlotReason = 'ok' | 'blocked' | 'closed' | 'full';
export type SlotsResult = { slots: string[]; reason: SlotReason };

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function minuteToTime(minute: number): string {
  return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}

export function timeToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
