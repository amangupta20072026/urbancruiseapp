/**
 * ------------------------------------------------------------------
 * Plan a Trip — date and text helpers
 * ------------------------------------------------------------------
 */

import type { CustomerTripRequest } from './types';

/** 12 Dec 2026 */
export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** 09:00 am */
export const formatTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

/** 12 Dec, 09:00 am */
export const formatPickup = (iso: string): string => {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${day}, ${formatTime(d)}`;
};

/** The date of `date` with the hours and minutes of `time`. */
export function combineDateAndTime(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

/** Midnight at the start of the given day. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "Delhi → Jaipur" */
export const routeLabel = (
  r: Pick<CustomerTripRequest, 'pickupCity' | 'dropCity'>,
): string => `${r.pickupCity} → ${r.dropCity}`;

/** "1 passenger" / "4 passengers" */
export const passengersLabel = (n: number): string =>
  `${n} ${n === 1 ? 'passenger' : 'passengers'}`;
