/**
 * ------------------------------------------------------------------
 * Directory contact — types
 * ------------------------------------------------------------------
 * `DirectoryContact` is the ONE input type of DirectoryContactSheet.
 * It is a discriminated union over the four directory roles, so:
 *   - a role can only ever be paired with its own entity type
 *     (`{ kind: 'vendor', data: someCustomer }` does not compile);
 *   - every `switch (contact.kind)` is checked for exhaustiveness —
 *     adding a fifth role fails the build until it is handled.
 *
 * `ContactProfile` is the role-agnostic view model the sheet renders.
 * Role differences live ONLY in profiles.ts (data → profile); the
 * sheet itself never branches on role, except for the customer-only
 * "View Full History" action (product decision).
 * ------------------------------------------------------------------
 */

import type { Customer } from '../../customers/types';
import type { Vendor } from '../../vendors/types';
import type { Staff } from '../../staff/types';
import type { Driver } from '../../drivers/types';

export type DirectoryContact =
  | { kind: 'customer'; data: Customer }
  | { kind: 'vendor'; data: Vendor }
  | { kind: 'staff'; data: Staff }
  | { kind: 'driver'; data: Driver };

export type DirectoryContactKind = DirectoryContact['kind'];

/**
 * Visual kind of an info row. Decides the icon and the tint; the
 * label text is set per role (e.g. 'City' vs 'Branch').
 */
export type ContactFieldKind =
  | 'type'
  | 'company'
  | 'phone'
  | 'email'
  | 'location'
  | 'taxId'
  | 'trips'
  | 'vehicles'
  | 'drivers'
  | 'license'
  | 'date';

export type ContactField = {
  /** Stable React key, unique within one profile. */
  key: string;
  kind: ContactFieldKind;
  label: string;
  value: string;
  /** Bold + tinted value (e.g. Total Trips). */
  emphasis?: boolean;
};

/** Icon shown before a header meta line. */
export type ContactMetaIcon = 'status' | 'role' | 'company';

export type ContactMeta = {
  key: string;
  icon: ContactMetaIcon;
  text: string;
};

/** A dialable number, as offered by Call / WhatsApp. */
export type ContactPhone = {
  /** Short label shown in the number picker (e.g. 'India', 'Work'). */
  label: string;
  value: string;
};

export type ContactProfile = {
  /** Seed for the deterministic avatar colour. */
  id: string;
  /** Main heading (person name, or company name for vendors). */
  title: string;
  /** Optional second line under the title (e.g. vendor owner). */
  subtitle: string | null;
  /** Small icon + text lines under the title (status, role…). */
  meta: ContactMeta[];
  /**
   * Distinct, non-empty numbers in priority order. 0 → Call and
   * WhatsApp disabled; 1 → act directly; 2+ → number picker.
   */
  phones: ContactPhone[];
  /** Trimmed address, or null when none — Email is then disabled. */
  email: string | null;
  whatsAppMessage: string;
  emailSubject: string;
  emailBody: string;
  fields: ContactField[];
};
