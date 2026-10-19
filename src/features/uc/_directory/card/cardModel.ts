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
import type { Staff } from '../../staff/types';
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
  | 'active'
  | 'inactive';

/** Rounded pill, normal-case text (one style for every role). */
export type CardBadge = { label: string; bg: string; fg: string };

export type CardLineTone = 'muted' | 'success';

export type CardLine = {
  key: string;
  icon: CardIcon;
  text: string;
  /** Text + icon colour. Defaults to 'muted' (grey). */
  tone?: CardLineTone;
  /** Show the full text on as many lines as needed (e.g. an address).
   *  Default: one line, shortened with "…". */
  wrap?: boolean;
};

export type CardFooterItem = {
  icon: CardIcon;
  text: string;
  /** Green + semibold (counts such as trips / vehicles). */
  emphasis: boolean;
  /** May be shortened with "…" when space runs out. The other footer
   *  item then always shows in full. */
  shrink: boolean;
};

export type DirectoryCardModel = {
  /** Seed for the deterministic avatar colour. */
  id: string;
  title: string;
  badge: CardBadge | null;
  lines: CardLine[];
  /** Bottom "left | right" row; null when the role has none (vendors). */
  footer: { left: CardFooterItem; right: CardFooterItem } | null;
  accessibilityLabel: string;
  accessibilityHint: string;
};

/* ------------------------------------------------------------------ */
/* Colours                                                            */
/* ------------------------------------------------------------------ */

/** Grey pill: readable textSecondary on the light-grey background. */
const GREY = { bg: Colors.borderLight, fg: Colors.textSecondary };

const VENDOR_STATUS_COLOUR: Record<
  Vendor['status'],
  { bg: string; fg: string }
> = {
  active: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  suspended: { bg: '#FEE2E2', fg: '#B91C1C' },
  inactive: GREY,
};

const DRIVER_VERIFICATION_COLOUR: Record<
  Driver['verification'],
  { bg: string; fg: string }
> = {
  verified: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  rejected: { bg: '#FEE2E2', fg: '#B91C1C' },
};

/** Staff department badge — one neutral colour for every department,
 *  because department names are free text from the server. */
const DEPARTMENT_COLOUR = { bg: '#EEF2FF', fg: '#4F46E5' };

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

/** City-style footer item that may shorten when space runs out. */
const shrinkable = (icon: CardIcon, value: string): CardFooterItem => ({
  icon,
  text: value,
  emphasis: false,
  shrink: true,
});

/** Green count (trips / vehicles) that always shows in full. */
const count = (icon: CardIcon, value: string): CardFooterItem => ({
  icon,
  text: value,
  emphasis: true,
  shrink: false,
});

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
      left: shrinkable('calendar', joined),
      right: count('trips', countLabel(c.totalBookings, 'Trip', 'Trips')),
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
  // Full address; falls back to the city when no address is saved.
  const location = text(v.address) || text(v.city);
  return {
    id: v.id,
    title: orEmpty(v.companyName),
    badge: { label: status, ...VENDOR_STATUS_COLOUR[v.status] },
    lines: [
      ...optionalLine('owner', 'company', v.ownerName),
      ...optionalLine('phone', 'phone', v.phone),
      ...optionalLine('email', 'mail', v.email),
      ...(location
        ? [
            {
              key: 'address',
              icon: 'location' as const,
              text: location,
              wrap: true,
            },
          ]
        : []),
    ],
    // No footer: vehicle count removed; city is part of the address.
    footer: null,
    accessibilityLabel: `Vendor ${orEmpty(v.companyName)}, ${status}`,
    accessibilityHint: 'Opens contact actions',
  };
}

function staffCard(s: Staff): DirectoryCardModel {
  const department = text(s.department);
  const status = s.active ? 'Active' : 'Inactive';
  return {
    id: s.id,
    title: orEmpty(s.name),
    // Department badge; no badge when the server sends no department.
    badge: department ? { label: department, ...DEPARTMENT_COLOUR } : null,
    lines: [
      s.active
        ? { key: 'status', icon: 'active', text: status, tone: 'success' }
        : { key: 'status', icon: 'inactive', text: status, tone: 'muted' },
    ],
    footer: {
      // City always in full; only the (long) email is shortened.
      left: {
        icon: 'location',
        text: orEmpty(s.city),
        emphasis: false,
        shrink: false,
      },
      right: shrinkable('mail', orEmpty(s.email)),
    },
    accessibilityLabel: [
      `Staff ${orEmpty(s.name)}`,
      department,
      status.toLowerCase(),
    ]
      .filter(Boolean)
      .join(', '),
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
      left: shrinkable('location', orEmpty(d.city)),
      right: count('trips', countLabel(d.completedTrips, 'trip', 'trips')),
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
