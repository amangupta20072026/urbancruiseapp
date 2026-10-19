/**
 * ------------------------------------------------------------------
 * Directory contact — role → profile mapping
 * ------------------------------------------------------------------
 * The ONLY place that knows how each role is presented in the
 * contact sheet. Pure functions (no React, no I/O) so every rule here
 * is unit-tested in __tests__/profiles.test.ts.
 *
 * Copy (labels, WhatsApp / email text) is carried over unchanged from
 * the four per-role sheets this replaces.
 * ------------------------------------------------------------------
 */

import {
  CUSTOMER_CATEGORY_LABEL,
  CUSTOMER_SUBTYPE_LABEL,
  type Customer,
} from '../../customers/types';
import { VENDOR_STATUS_LABEL, type Vendor } from '../../vendors/types';
import { STAFF_SUBROLE_LABEL, type Staff } from '../../staff/types';
import { DRIVER_VERIFICATION_LABEL, type Driver } from '../../drivers/types';

import type {
  ContactField,
  ContactPhone,
  ContactProfile,
  DirectoryContact,
} from './types';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Shown when a required value is missing or unparseable. */
export const EMPTY_VALUE = '—';

const trimmed = (v: string | null | undefined): string => (v ?? '').trim();

/** Trimmed value, or null when empty. */
const present = (v: string | null | undefined): string | null => {
  const t = trimmed(v);
  return t.length > 0 ? t : null;
};

/** First word of a name, for greetings. Empty when there is no name. */
export function firstName(name: string): string {
  return trimmed(name).split(/\s+/)[0] ?? '';
}

/** 'Hi Ravi' — or just 'Hi' when the name is empty. */
const salutation = (name: string): string => {
  const first = firstName(name);
  return first ? `Hi ${first}` : 'Hi';
};

/** '01 Aug 2026'. Invalid / empty input renders EMPTY_VALUE. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Keeps numbers that are non-empty and distinct. Two numbers are the
 * same when their digits match, so '+91 98100 00000' and
 * '+919810000000' never produce a pointless two-row picker.
 */
export function distinctPhones(
  candidates: ReadonlyArray<{ label: string; value: string | undefined }>,
): ContactPhone[] {
  const seen = new Set<string>();
  const out: ContactPhone[] = [];
  for (const c of candidates) {
    const value = present(c.value);
    if (!value) continue;
    const digits = value.replace(/\D/g, '');
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    out.push({ label: c.label, value });
  }
  return out;
}

/** A row whose value may be absent: dropped when empty. */
const optionalField = (
  field: Omit<ContactField, 'value'> & { value: string | null | undefined },
): ContactField[] => {
  const value = present(field.value);
  return value ? [{ ...field, value }] : [];
};

/** A row that is always shown: EMPTY_VALUE when the value is missing. */
const requiredField = (
  field: Omit<ContactField, 'value'> & { value: string | null | undefined },
): ContactField => ({ ...field, value: present(field.value) ?? EMPTY_VALUE });

/* ------------------------------------------------------------------ */
/* Per-role mappers                                                   */
/* ------------------------------------------------------------------ */

function customerProfile(c: Customer): ContactProfile {
  const category = CUSTOMER_CATEGORY_LABEL[c.category];
  const subType = CUSTOMER_SUBTYPE_LABEL[c.customerType];
  // 'Personal • Personal' carries no information — show it once.
  const typeLabel =
    category === subType ? category : `${category} • ${subType}`;

  return {
    id: c.id,
    title: trimmed(c.name) || EMPTY_VALUE,
    subtitle: null,
    meta: [],
    phones: distinctPhones([
      { label: 'India', value: c.phoneIndia },
      { label: 'Global', value: c.phoneGlobal },
    ]),
    email: present(c.email),
    whatsAppMessage: `${salutation(c.name)}, this is Urban Cruise.`,
    emailSubject: 'Urban Cruise — Follow up',
    emailBody: `${salutation(c.name)},\n\n`,
    fields: [
      requiredField({
        key: 'type',
        kind: 'type',
        label: 'Customer Type',
        value: typeLabel,
      }),
      // Company name — corporate + agent only.
      ...(c.category !== 'personal'
        ? optionalField({
            key: 'company',
            kind: 'company',
            label: 'Company Name',
            value: c.companyName,
          })
        : []),
      requiredField({
        key: 'phoneIndia',
        kind: 'phone',
        label: 'Phone (India)',
        value: c.phoneIndia,
      }),
      ...optionalField({
        key: 'phoneGlobal',
        kind: 'phone',
        label: 'Phone (Global)',
        value: c.phoneGlobal,
      }),
      ...optionalField({
        key: 'email',
        kind: 'email',
        label: 'Email',
        value: c.email,
      }),
      requiredField({
        key: 'city',
        kind: 'location',
        label: 'City',
        value: c.city,
      }),
      ...optionalField({
        key: 'gstin',
        kind: 'taxId',
        label: 'GSTIN',
        value: c.gstin,
      }),
      {
        key: 'trips',
        kind: 'trips',
        label: 'Total Trips',
        value: String(c.totalBookings),
        emphasis: true,
      },
      {
        key: 'registered',
        kind: 'date',
        label: 'Registered',
        value: formatDate(c.createdAt),
      },
    ],
  };
}

function vendorProfile(v: Vendor): ContactProfile {
  return {
    id: v.id,
    title: trimmed(v.companyName) || EMPTY_VALUE,
    subtitle: present(v.ownerName),
    meta: [
      { key: 'status', icon: 'status', text: VENDOR_STATUS_LABEL[v.status] },
    ],
    phones: distinctPhones([
      { label: 'Primary', value: v.phone },
      { label: 'Secondary', value: v.phoneAlt },
    ]),
    email: present(v.email),
    whatsAppMessage: `Hi, this is Urban Cruise reaching out regarding ${
      trimmed(v.companyName) || 'your company'
    }.`,
    emailSubject: 'Urban Cruise — Vendor follow up',
    emailBody: `${salutation(v.ownerName)},\n\n`,
    fields: [
      requiredField({
        key: 'phone',
        kind: 'phone',
        label: 'Primary Phone',
        value: v.phone,
      }),
      ...optionalField({
        key: 'phoneAlt',
        kind: 'phone',
        label: 'Secondary Phone',
        value: v.phoneAlt,
      }),
      ...optionalField({
        key: 'email',
        kind: 'email',
        label: 'Email',
        value: v.email,
      }),
      requiredField({
        key: 'city',
        kind: 'location',
        label: 'City',
        value: v.city,
      }),
      ...optionalField({
        key: 'gstin',
        kind: 'taxId',
        label: 'GSTIN',
        value: v.gstin,
      }),
      {
        key: 'vehicles',
        kind: 'vehicles',
        label: 'Vehicles',
        value: String(v.vehicleCount),
      },
      {
        key: 'drivers',
        kind: 'drivers',
        label: 'Drivers',
        value: String(v.driverCount),
      },
      {
        key: 'onboarded',
        kind: 'date',
        label: 'Onboarded',
        value: formatDate(v.createdAt),
      },
    ],
  };
}

function staffProfile(s: Staff): ContactProfile {
  const role = STAFF_SUBROLE_LABEL[s.subRole];
  return {
    id: s.id,
    title: trimmed(s.name) || EMPTY_VALUE,
    subtitle: null,
    meta: [
      {
        key: 'role',
        icon: 'role',
        text: s.active ? role : `${role} • Inactive`,
      },
    ],
    phones: distinctPhones([
      { label: 'Work', value: s.phone },
      { label: 'Alternate', value: s.phoneAlt },
    ]),
    email: present(s.email),
    whatsAppMessage: 'Hi, this is Urban Cruise.',
    emailSubject: 'Urban Cruise — team',
    emailBody: `${salutation(s.name)},\n\n`,
    fields: [
      requiredField({
        key: 'phone',
        kind: 'phone',
        label: 'Work Phone',
        value: s.phone,
      }),
      ...optionalField({
        key: 'phoneAlt',
        kind: 'phone',
        label: 'Alternate Phone',
        value: s.phoneAlt,
      }),
      ...optionalField({
        key: 'email',
        kind: 'email',
        label: 'Email',
        value: s.email,
      }),
      requiredField({
        key: 'branch',
        kind: 'location',
        label: 'Branch',
        value: s.city,
      }),
      {
        key: 'joined',
        kind: 'date',
        label: 'Joined',
        value: formatDate(s.joinedAt),
      },
    ],
  };
}

function driverProfile(d: Driver): ContactProfile {
  return {
    id: d.id,
    title: trimmed(d.name) || EMPTY_VALUE,
    subtitle: null,
    meta: [
      ...(present(d.vendorName)
        ? [
            {
              key: 'vendor',
              icon: 'company' as const,
              text: trimmed(d.vendorName),
            },
          ]
        : []),
      {
        key: 'verification',
        icon: 'status',
        text: DRIVER_VERIFICATION_LABEL[d.verification],
      },
    ],
    phones: distinctPhones([
      { label: 'Primary', value: d.phone },
      { label: 'Alternate', value: d.phoneAlt },
    ]),
    email: present(d.email),
    whatsAppMessage: `${salutation(d.name)}, this is Urban Cruise.`,
    emailSubject: 'Urban Cruise — Driver follow up',
    emailBody: `${salutation(d.name)},\n\n`,
    fields: [
      requiredField({
        key: 'phone',
        kind: 'phone',
        label: 'Primary Phone',
        value: d.phone,
      }),
      ...optionalField({
        key: 'phoneAlt',
        kind: 'phone',
        label: 'Alternate Phone',
        value: d.phoneAlt,
      }),
      ...optionalField({
        key: 'email',
        kind: 'email',
        label: 'Email',
        value: d.email,
      }),
      requiredField({
        key: 'city',
        kind: 'location',
        label: 'City',
        value: d.city,
      }),
      requiredField({
        key: 'vendor',
        kind: 'company',
        label: 'Vendor',
        value: d.vendorName,
      }),
      requiredField({
        key: 'license',
        kind: 'license',
        label: 'License No.',
        value: d.licenseNo,
      }),
      {
        key: 'onboarded',
        kind: 'date',
        label: 'Onboarded',
        value: formatDate(d.createdAt),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

function assertNever(x: never): never {
  throw new Error(`Unhandled directory contact kind: ${JSON.stringify(x)}`);
}

export function toContactProfile(contact: DirectoryContact): ContactProfile {
  switch (contact.kind) {
    case 'customer':
      return customerProfile(contact.data);
    case 'vendor':
      return vendorProfile(contact.data);
    case 'staff':
      return staffProfile(contact.data);
    case 'driver':
      return driverProfile(contact.data);
    default:
      return assertNever(contact);
  }
}