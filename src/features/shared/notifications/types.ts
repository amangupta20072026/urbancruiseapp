/**
 * ------------------------------------------------------------------
 * Notifications — types
 * ------------------------------------------------------------------
 * SSoT for the notification list. Kept in /shared/ because every
 * role consumes the same shape today; if a role ever needs its own
 * extension it should be a discriminated variant here, not a fork.
 *
 * `kind` drives the icon + tint + destination when tapped.
 * `category` drives the filter-chip strip on the list screen.
 * The two are related but not identical — different kinds can share
 * one category (e.g. quotation_ready + quotation_update are both
 * 'quote'; trip_confirmed + driver_assigned are both 'booking').
 * ------------------------------------------------------------------
 */

/** Filter-chip buckets — 'all' is a virtual filter, not a category. */
export type NotificationCategory = 'quote' | 'booking' | 'payment' | 'general';

/** Concrete notification kinds. Extend as new server events land. */
export type NotificationKind =
  | 'quotation_ready'
  | 'quotation_update'
  | 'trip_confirmed'
  | 'driver_assigned'
  | 'payment_success'
  | 'welcome'
  | 'promo'
  | 'app_update';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ISO 8601. Grouping into Today / Yesterday / Earlier is derived. */
  timestamp: string;
  /** Drives the green dot + tinted card bg. Flipped on tap. */
  unread: boolean;
  /**
   * JSON-serializable DeepLinkTarget. Present when the notification has
   * a tap destination (e.g. { kind: 'customer.bookingDetail', bookingId: '…' }).
   * Null for purely informational notifications (promos, app_update).
   * The screen passes this to handleFcmClick() on tap.
   */
  payload: Record<string, unknown> | null;
};
