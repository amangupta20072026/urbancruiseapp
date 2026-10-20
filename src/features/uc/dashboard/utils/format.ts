/**
 * ------------------------------------------------------------------
 * UC dashboard — display formatting (pure, unit-tested)
 * ------------------------------------------------------------------
 */

/** 'Good morning' before 12:00, 'Good afternoon' before 17:00, else
 *  'Good evening' — in the device's local time. */
export function partOfDay(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The date card's three lines, e.g. { day: '11', monthYear:
 *  'Aug 2025', weekday: 'Monday' }. */
export function dateCardParts(now: Date): {
  day: string;
  monthYear: string;
  weekday: string;
} {
  return {
    day: String(now.getDate()),
    monthYear: now.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    }),
    weekday: now.toLocaleDateString('en-GB', { weekday: 'long' }),
  };
}

/** '01 Aug 2025 • 10:30 AM'. Invalid input gives '—'. */
export function formatBookingDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${date} • ${time}`;
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
export function bookingsLabel(n: number): string {
  return `${n} ${n === 1 ? 'Booking' : 'Bookings'}`;
}
