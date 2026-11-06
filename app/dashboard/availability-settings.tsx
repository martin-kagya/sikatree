'use client';

import { useActionState, useState } from 'react';
import { Dropdown } from '@/components/ui/dropdown';
import {
  SLOT_MINUTES_OPTIONS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  minuteToTime,
} from '@/lib/availability-shared';
import { saveAvailabilityAction, type AvailabilitySettingsState } from './actions';

const initial: AvailabilitySettingsState = {};

const field =
  'h-10 rounded-[10px] border border-hairline bg-white px-3 text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink/20 focus:border-green-deep focus:ring-2 focus:ring-green-deep';

const timeField =
  'h-10 min-w-0 flex-1 rounded-[10px] border border-hairline bg-white px-2 text-[12px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-green-deep focus:ring-2 focus:ring-green-deep';

// Monday first.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilitySettings({
  windows,
  blockedDates,
  slotMinutes,
  weeklyCap,
}: {
  windows: { weekday: number; startMinute: number; endMinute: number }[];
  blockedDates: string[];
  slotMinutes: number;
  weeklyCap: number | null;
}) {
  const [state, action, pending] = useActionState(saveAvailabilityAction, initial);
  const [blocked, setBlocked] = useState(blockedDates);
  const [draftDate, setDraftDate] = useState('');

  const byDay = new Map(windows.map((window) => [window.weekday, window]));

  return (
    <form action={action} className="mt-4 space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-[12px] bg-mint-100 p-3 text-[13px] text-green-deep">
          Availability saved. Customers see these hours now.
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-[13px] font-medium text-ink">Open days and hours</p>
        {ORDER.map((weekday) => {
          const window = byDay.get(weekday);
          return (
            <div key={weekday} className="flex items-center gap-2">
              <label className="flex w-[72px] shrink-0 items-center gap-1.5 text-[13px] text-ink sm:w-[128px] sm:gap-2">
                <input
                  type="checkbox"
                  name={`enabled-${weekday}`}
                  defaultChecked={Boolean(window)}
                  className="h-4 w-4 shrink-0 rounded border-hairline"
                />
                <span className="sm:hidden">{WEEKDAY_SHORT[weekday]}</span>
                <span className="hidden sm:inline">{WEEKDAY_NAMES[weekday]}</span>
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  type="time"
                  name={`start-${weekday}`}
                  defaultValue={window ? minuteToTime(window.startMinute) : '09:00'}
                  aria-label={`${WEEKDAY_NAMES[weekday]} start time`}
                  className={timeField}
                />
                <span className="shrink-0 text-[11px] text-ink-muted">–</span>
                <input
                  type="time"
                  name={`end-${weekday}`}
                  defaultValue={window ? minuteToTime(window.endMinute) : '17:00'}
                  aria-label={`${WEEKDAY_NAMES[weekday]} end time`}
                  className={timeField}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="slotMinutes" className="mb-1.5 block text-[13px] font-medium text-ink">
            Slot length
          </label>
          <Dropdown
            id="slotMinutes"
            name="slotMinutes"
            defaultValue={String(slotMinutes)}
            ariaLabel="Slot length"
            options={SLOT_MINUTES_OPTIONS.map((option) => ({
              value: String(option),
              label: `${option} minutes`,
            }))}
          />
        </div>
        <div>
          <label htmlFor="weeklyCap" className="mb-1.5 block text-[13px] font-medium text-ink">
            Bookings per week (optional)
          </label>
          <input
            id="weeklyCap"
            name="weeklyCap"
            type="number"
            min={1}
            max={500}
            defaultValue={weeklyCap ?? ''}
            placeholder="No limit"
            className={`${field} w-full`}
          />
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Leave blank for no limit. When set, no more slots open that week once it is reached.
          </p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-ink">Fully booked or away</p>
        <p className="mt-1 text-[12px] text-ink-muted">
          Block specific dates so customers cannot book on them.
        </p>
        {blocked.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {blocked.map((date) => (
              <li key={date}>
                <input type="hidden" name="blockedDate" value={date} />
                <button
                  type="button"
                  onClick={() =>
                    setBlocked((current) => current.filter((value) => value !== date))
                  }
                  aria-label={`Unblock ${date}`}
                  className="inline-flex h-8 items-center gap-1 rounded-pill border border-hairline bg-white px-3 text-[12px] text-ink hover:border-ink/40"
                >
                  {date}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-ink-muted">No blocked dates.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={draftDate}
            onChange={(event) => setDraftDate(event.target.value)}
            aria-label="Date to block"
            className={field}
          />
          <button
            type="button"
            onClick={() => {
              if (!draftDate) return;
              setBlocked((current) => (current.includes(draftDate) ? current : [...current, draftDate].sort()));
              setDraftDate('');
            }}
            className="inline-flex h-10 items-center rounded-pill border border-hairline bg-white px-4 text-[13px] text-ink hover:border-ink/40"
          >
            Block date
          </button>
        </div>
      </div>

      <div className="border-t border-hairline pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center rounded-pill bg-green-main px-6 text-label text-ink transition-[transform,background-color] duration-200 hover:bg-green-main/90 active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save availability'}
        </button>
      </div>
    </form>
  );
}
