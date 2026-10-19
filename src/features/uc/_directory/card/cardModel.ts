/**
 * ------------------------------------------------------------------
 * Directory card — role → card model
 * ------------------------------------------------------------------
 * The ONLY place that knows how each role is shown in a list row.
 * Pure functions (no React) so every rule is unit-tested in
 * __tests__/cardModel.test.ts. DirectoryCard renders the result and
 * never branches on role.
 *
 * Every row has the same skeleton:
 *
 *   [Avatar]  Title (full, wraps) ........ [Badge]   >
 *             (icon) line …           (0–2 lines)
 *             (icon) left  |  (icon) right
 * ------------------------------------------------------------------
 */

import { Colors } from '@theme';

import {
  CUSTOMER_CATEGORY_COLOR,
  CUSTOMER_CATEGORY_LABEL,
  type Customer,
} from '../../customers/types';
import { VENDOR_STATUS_LABEL, type Vendor } from '../../vendors/types';
import { STAFF_SUBROLE_LABEL, type Staff } from '../../staff/types';
import { DRIVER_VERIFICATION_LABEL, type Driver } from '../../drivers/types';
import { EMPTY_VALUE, formatDate } from '../contact/profiles';
import type { DirectoryContact } from '../contact/types';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type CardIcon =
  | 'phone'
  | 'mail'
  | 'calendar'
  | 'trips'
  | 'company'
  | 'location'
  | 'vehicles'
  | 'role';

/** Rounded pill, normal-case text (one style for every role). */
export type CardBadge = { label: string; bg: string; fg: string };

export type CardLine = { key: string; icon: CardIcon; text: string };

export type CardFooterItem = {
  icon: CardIcon;
  text: string;
  /** Green + semibold (counts such as trips / vehicles). */
  emphasis: boolean;
};

export type DirectoryCardModel = {
  /** Seed for the deterministic avatar colour. */
  id: string;
  title: string;
  badge: CardBadge | null;
  lines: CardLine[];
  footer: { left: CardFooterItem; right: CardFooterItem };
  accessibilityLabel: string;
  accessibilityHint: string;
};

/* ------------------------------------------------------------------ */
/* Colours (carried over from the four former cards)                  */
/* ------------------------------------------------------------------ */

const VENDOR_STATUS_COLOUR: Record<
  Vendor['status'],
  { bg: string; fg: string }
> = {
  active: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  suspended: { bg: '#FEE2E2', fg: '#B91C1C' },
};

const DRIVER_VERIFICATION_COLOUR: Record<
  Driver['verification'],
  { bg: string; fg: string }
> = {
  verified: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  rejected: { bg: '#FEE2E2', fg: '#B91C1C' },
};

/** Inactive staff. textSecondary (not textMuted) keeps the label
 *  readable on the light-grey pill. */
const INACTIVE_COLOUR = { bg: Colors.borderLight, fg: Colors.textSecondary };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const text = (v: string | null | undefined): string => (v ?? '').trim();

const orEmpty = (v: string | null | undefined): string =>
  text(v) || EMPTY_VALUE;

/** '1 trip' / '3 trips' — `one` and `many` keep each role's casing. */
export const countLabel = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

const optionalLine = (
  key: string,
  icon: CardIcon,
  value: string | null | undefined,
): CardLine[] => {
  const t = text(value);
  return t ? [{ key, icon, text: t }] : [];
};

/* ------------------------------------------------------------------ */
/* Per-role mappers                                                   */
/* ------------------------------------------------------------------ */

function customerCard(c: Customer): DirectoryCardModel {
  const categoryLabel = CUSTOMER_CATEGORY_LABEL[c.category];
  const joined = formatDate(c.createdAt);
  return {
    id: c.id,
    title: orEmpty(c.name),
    badge: { label: categoryLabel, ...CUSTOMER_CATEGORY_COLOR[c.category] },
    lines: [
      ...optionalLine('phone', 'phone', c.phoneIndia),
      ...optionalLine('email', 'mail', c.email),
    ],
    footer: {
      left: { icon: 'calendar', text: joined, emphasis: false },
      right: {
        icon: 'trips',
        text: countLabel(c.totalBookings, 'Trip', 'Trips'),
        emphasis: true,
      },
    },
    accessibilityLabel: `${orEmpty(
      c.name,
    )}, ${categoryLabel} customer, ${countLabel(
      c.totalBookings,
      'trip',
      'trips',
    )}, joined ${joined}`,
    accessibilityHint: 'Opens customer details',
  };
}

function vendorCard(v: Vendor): DirectoryCardModel {
  const status = VENDOR_STATUS_LABEL[v.status];
  return {
    id: v.id,
    title: orEmpty(v.companyName),
    badge: { label: status, ...VENDOR_STATUS_COLOUR[v.status] },
    lines: optionalLine('owner', 'company', v.ownerName),
    footer: {
      left: { icon: 'location', text: orEmpty(v.city), emphasis: false },
      right: {
        icon: 'vehicles',
        text: countLabel(v.vehicleCount, 'vehicle', 'vehicles'),
        emphasis: true,
      },
    },
    accessibilityLabel: `Vendor ${orEmpty(v.companyName)}, ${status}`,
    accessibilityHint: 'Opens contact actions',
  };
}

function staffCard(s: Staff): DirectoryCardModel {
  return {
    id: s.id,
    title: orEmpty(s.name),
    // Active staff show no badge; inactive staff get a grey pill.
    badge: s.active ? null : { label: 'Inactive', ...INACTIVE_COLOUR },
    lines: [
      { key: 'role', icon: 'role', text: STAFF_SUBROLE_LABEL[s.subRole] },
    ],
    footer: {
      left: { icon: 'location', text: orEmpty(s.city), emphasis: false },
      right: { icon: 'mail', text: orEmpty(s.email), emphasis: false },
    },
    accessibilityLabel: `Staff ${orEmpty(s.name)}${
      s.active ? '' : ', inactive'
    }`,
    accessibilityHint: 'Opens contact actions',
  };
}

function driverCard(d: Driver): DirectoryCardModel {
  const verification = DRIVER_VERIFICATION_LABEL[d.verification];
  return {
    id: d.id,
    title: orEmpty(d.name),
    badge: {
      label: verification,
      ...DRIVER_VERIFICATION_COLOUR[d.verification],
    },
    lines: optionalLine('vendor', 'company', d.vendorName),
    footer: {
      left: { icon: 'location', text: orEmpty(d.city), emphasis: false },
      right: {
        icon: 'trips',
        text: countLabel(d.completedTrips, 'trip', 'trips'),
        emphasis: true,
      },
    },
    accessibilityLabel: `Driver ${orEmpty(d.name)}, ${verification}`,
    accessibilityHint: 'Opens contact actions',
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

function assertNever(x: never): never {
  throw new Error(`Unhandled directory contact kind: ${JSON.stringify(x)}`);
}

export function toCardModel(contact: DirectoryContact): DirectoryCardModel {
  switch (contact.kind) {
    case 'customer':
      return customerCard(contact.data);
    case 'vendor':
      return vendorCard(contact.data);
    case 'staff':
      return staffCard(contact.data);
    case 'driver':
      return driverCard(contact.data);
    default:
      return assertNever(contact);
  }
}
