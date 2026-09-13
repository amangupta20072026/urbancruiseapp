/**
 * ------------------------------------------------------------------
 * Notifications — mock fixture
 * ------------------------------------------------------------------
 * Seeds the shared notification list for demos. Timestamps are
 * derived from `new Date()` each import so the Today / Yesterday /
 * Earlier grouping always matches the current calendar day — a
 * fixed ISO would drift into "Earlier" the next morning and the
 * demo would look wrong without any code change.
 *
 * DELETE this file entirely when the notifications endpoint ships;
 * the screen switches to a TanStack Query hook and this fixture
 * has no further consumers.
 * ------------------------------------------------------------------
 */

import { subDays, subHours, subMinutes } from 'date-fns';

import type { NotificationItem } from './types';

/** Helper: an ISO timestamp `hoursAgo` hours + `minutesAgo` minutes ago. */
const ago = (hoursAgo: number, minutesAgo = 0): string =>
  subMinutes(subHours(new Date(), hoursAgo), minutesAgo).toISOString();

/** Helper: an ISO timestamp N days ago, at a specific hour of that day. */
const daysAgoAt = (days: number, hour: number, minute = 0): string => {
  const d = subDays(new Date(), days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/**
 * Fixture is ordered newest-first so the screen can render without
 * an extra sort pass — matches the order real API results should
 * arrive in.
 */
export const MOCK_NOTIFICATIONS: readonly NotificationItem[] = [
  /* ── Today ─────────────────────────────────────────────────── */
  {
    id: 'n_001',
    kind: 'quotation_ready',
    category: 'quote',
    title: 'Quotation Ready!',
    body: 'Your quotation QREQ-2026-28996 is ready. Tap to view details.',
    timestamp: ago(1, 15),
    unread: true,
  },
  {
    id: 'n_002',
    kind: 'trip_confirmed',
    category: 'booking',
    title: 'Trip Confirmed',
    body: 'Your booking for Delhi to Jaipur on 15 Sep 2026 has been confirmed.',
    timestamp: ago(3, 30),
    unread: false,
  },
  {
    id: 'n_003',
    kind: 'welcome',
    category: 'general',
    title: 'Welcome!',
    body: "Thank you for joining us. Let's plan more journeys together!",
    timestamp: ago(5, 0),
    unread: false,
  },

  /* ── Yesterday ─────────────────────────────────────────────── */
  {
    id: 'n_004',
    kind: 'quotation_update',
    category: 'quote',
    title: 'Quotation Update',
    body: "We've updated your quotation QREQ-2026-28991. Tap to view the latest options.",
    timestamp: daysAgoAt(1, 17, 24),
    unread: false,
  },
  {
    id: 'n_005',
    kind: 'driver_assigned',
    category: 'booking',
    title: 'Driver Assigned',
    body: 'Your driver has been assigned for your upcoming trip on 12 Sep 2026.',
    timestamp: daysAgoAt(1, 14, 10),
    unread: false,
  },
  {
    id: 'n_006',
    kind: 'payment_success',
    category: 'payment',
    title: 'Payment Successful',
    body: 'Your payment of ₹12,000 has been received. Thank you!',
    timestamp: daysAgoAt(1, 11, 45),
    unread: false,
  },

  /* ── Earlier ───────────────────────────────────────────────── */
  {
    id: 'n_007',
    kind: 'promo',
    category: 'general',
    title: 'Special Offer',
    body: 'Get 10% off on outstation trips. Plan your next journey with us!',
    timestamp: daysAgoAt(8, 9, 30),
    unread: false,
  },
  {
    id: 'n_008',
    kind: 'app_update',
    category: 'general',
    title: 'App Update',
    body: 'A new version of the app is available with improved features.',
    timestamp: daysAgoAt(11, 10, 0),
    unread: false,
  },
];
