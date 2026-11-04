/**
 * ------------------------------------------------------------------
 * UC dashboard — display formatting (pure, unit-tested)
 * ------------------------------------------------------------------
 */

import type { Money } from '@app-types/currency';

/** The date card's lines, e.g. { day: '11', monthYear: 'Aug 2025',
 *  weekdayShort: 'Mon', weekday: 'Monday' }. The card shows the short
 *  weekday (to stay compact); screen readers get the full one. */
export function dateCardParts(now: Date): {
  day: string;
  monthYear: string;
  weekdayShort: string;
  weekday: string;
} {
  return {
    day: String(now.getDate()),
    monthYear: now.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    }),
    weekdayShort: now.toLocaleDateString('en-GB', { weekday: 'short' }),
    weekday: now.toLocaleDateString('en-GB', { weekday: 'long' }),
  };
}

/** Parses a local 'YYYY-MM-DD' day without the UTC shift that
 *  `new Date('YYYY-MM-DD')` applies. */
export function parseLocalDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local 'YYYY-MM-DD' for a date. */
export function toLocalDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Chart axis label, e.g. 'Aug 5'. */
export function trendDayLabel(day: string): string {
  return parseLocalDay(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** '1 Booking' / '52 Bookings'. */
/**
 * Money in whole rupees with Indian grouping (trend bubble margin,
 * outstanding collection card):
 * 3600000 paise → '₹36,000', 12345678 → '₹1,23,457' (rounded to the
 * nearest rupee — the bubble has no room for paise). A loss shows as
 * '−₹1,200'. Not a finite number → '—'.
 */
export function formatRupees(m: Money): string {
  if (!Number.isFinite(m.amount)) return '—';
  const rupees = Math.round(Math.abs(m.amount) / 100);
  const text = `₹${rupees.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
  return m.amount < 0 && rupees !== 0 ? `−${text}` : text;
}

export function bookingsLabel(n: number): string {
  return `${n} ${n === 1 ? 'Booking' : 'Bookings'}`;
}
