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
 *             (icon) line …           (0–4 lines)
 *             (icon) left  |  (icon) right
 * ------------------------------------------------------------------
 */

import { Colors } from '@theme';
import { maskPhone } from '@shared/utils';

import {
  CUSTOMER_CATEGORY_COLOR,
  CUSTOMER_CATEGORY_LABEL,
  type Customer,
} from '../../customers/types';
import { VENDOR_STATUS_LABEL, type Vendor } from '../../vendors/types';
import { departmentColor, type Staff } from '../../staff/types';
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
  | 'garage';

/** Rounded pill, normal-case text (one style for every role). */
export type CardBadge = { label: string; bg: string; fg: string };

export type CardLine = {
  key: string;
  icon: CardIcon;
  text: string;
  /** Show the full text on as many lines as needed (e.g. an address).
   *  Default: one line, shortened with "…". */
  wrap?: boolean;
  /** Draw as a tinted chip (company names), shown in full on as many
   *  lines as needed. Default: plain line. */
  chip?: boolean;
  /** Chip only: shown after the text with a map-pin icon (the city).
   *  Never shortened: moves to the next line when it doesn't fit. */
  suffix?: string;
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
  NonNullable<Vendor['status']>,
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const text = (v: string | null | undefined): string => (v ?? '').trim();

const orEmpty = (v: string | null | undefined): string =>
  text(v) || EMPTY_VALUE;

const optionalLine = (
  key: string,
  icon: CardIcon,
  value: string | null | undefined,
): CardLine[] => {
  const t = text(value);
  return t ? [{ key, icon, text: t }] : [];
};

/** Company name as a tinted chip, with an optional suffix (city).
 *  Dropped when the company name is blank; a blank suffix is left out. */
const companyLine = (
  key: string,
  value: string | null | undefined,
  suffix?: string | null,
): CardLine[] => {
  const s = text(suffix);
  return optionalLine(key, 'company', value).map(line => ({
    ...line,
    chip: true,
    ...(s ? { suffix: s } : {}),
  }));
};

/** Phone line, masked for display (see shared/utils/phone.ts). */
const phoneLine = (value: string | null | undefined): CardLine[] =>
  optionalLine('phone', 'phone', maskPhone(value));

/* ------------------------------------------------------------------ */
/* Per-role mappers                                                   */
/* ------------------------------------------------------------------ */

function customerCard(c: Customer): DirectoryCardModel {
  // No badge when the customer type is not set in the database.
  const categoryLabel = c.category ? CUSTOMER_CATEGORY_LABEL[c.category] : '';
  const joined = c.createdAt ? formatDate(c.createdAt) : '';
  // Company chip for corporate + agent; also for a customer with no type
  // but a company name, so that name isn't lost.
  const hasCompany = c.category !== 'personal';
  // City rides in the company chip, so personal customers show none.
  const city = hasCompany ? text(c.city) : '';
  return {
    id: c.id,
    title: orEmpty(c.name),
    badge: c.category
      ? { label: categoryLabel, ...CUSTOMER_CATEGORY_COLOR[c.category] }
      : null,
    lines: [
      // Company chip under the title, with the city after a map pin
      // (same as the vendor card). Dropped when the company is blank.
      ...(hasCompany ? companyLine('company', c.companyName, city) : []),
      ...phoneLine(c.phoneIndia),
      ...optionalLine('email', 'mail', c.email),
      // Joined date. No bookings count: the Directory reads only the
      // customers table (product decision).
      ...optionalLine('joined', 'calendar', joined),
    ],
    footer: null,
    accessibilityLabel: [
      categoryLabel
        ? `${orEmpty(c.name)}, ${categoryLabel} customer`
        : `${orEmpty(c.name)}, customer`,
      hasCompany ? text(c.companyName) : '',
      city,
      joined ? `joined ${joined}` : '',
    ]
      .filter(Boolean)
      .join(', '),
    accessibilityHint: 'Opens customer details',
  };
}

function vendorCard(v: Vendor): DirectoryCardModel {
  // No badge for a status this app version doesn't know.
  const status = v.status ? VENDOR_STATUS_LABEL[v.status] : '';
  return {
    id: v.id,
    // vendors.name is the title; the company name is the first line below.
    title: orEmpty(v.ownerName),
    badge: v.status
      ? { label: status, ...VENDOR_STATUS_COLOUR[v.status] }
      : null,
    lines: [
      ...companyLine('company', v.companyName),
      ...phoneLine(v.phone),
      ...optionalLine('email', 'mail', v.email),
      // City with a map pin. The full address is on the contact sheet.
      ...optionalLine('location', 'location', v.city),
    ],
    footer: null,
    accessibilityLabel: [
      `Vendor ${orEmpty(v.ownerName)}`,
      text(v.companyName),
      text(v.city),
      status,
    ]
      .filter(Boolean)
      .join(', '),
    accessibilityHint: 'Opens contact actions',
  };
}

function staffCard(s: Staff): DirectoryCardModel {
  const department = text(s.department);
  return {
    id: s.id,
    title: orEmpty(s.name),
    // Department badge; no badge when the server sends no department.
    // Colour per department; unknown departments get the neutral badge.
    badge: department
      ? { label: department, ...departmentColor(department) }
      : null,
    // No active / inactive status on the card (product decision).
    lines: [
      ...phoneLine(s.phone),
      ...optionalLine('email', 'mail', s.email),
      ...optionalLine('city', 'location', s.city),
    ],
    footer: null,
    accessibilityLabel: [`Staff ${orEmpty(s.name)}`, department]
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
    // Vendor company chip first (right under the name, like the customer
    // and vendor cards), then phone, email and city. Blank values get no
    // line. No trips count: the Directory reads only the drivers and
    // vendors tables (product decision).
    lines: [
      ...companyLine('vendor', d.vendorName),
      ...phoneLine(d.phone),
      ...optionalLine('email', 'mail', d.email),
      ...optionalLine('city', 'location', d.city),
    ],
    footer: null,
    accessibilityLabel: [
      `Driver ${orEmpty(d.name)}`,
      verification,
      text(d.vendorName),
      text(d.city),
    ]
      .filter(Boolean)
      .join(', '),
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
