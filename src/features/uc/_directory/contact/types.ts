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
 * It comes in two layouts: 'list' (customers, staff, drivers) and
 * 'sections' (vendors). Role differences live ONLY in profiles.ts
 * (data → profile); the sheet branches on the layout, never on the
 * role, except for the customer-only "View Full History" action
 * (product decision).
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
  | 'license'
  | 'date'
  | 'department'
  | 'subDepartment';

export type ContactField = {
  /** Stable React key, unique within one profile. */
  key: string;
  kind: ContactFieldKind;
  label: string;
  value: string;
  /** Bold + tinted value (e.g. Total Trips). */
  emphasis?: boolean;
  /** Overrides the kind's icon tint, e.g. the staff department colour. */
  colors?: { bg: string; fg: string };
  /** Draw the value as a rounded pill in `colors` (e.g. Department). */
  badge?: boolean;
};

/** Icon shown before a header meta line. */
export type ContactMetaIcon = 'status' | 'company';

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

/** Colour family of a status pill. The sheet maps each tone to colours. */
export type ContactTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Rounded status pill, e.g. 'Active' or 'Verified'. */
export type ContactPill = { label: string; tone: ContactTone };

/** Icon of a row in the sectioned layout. */
export type ContactRowKind =
  | 'company'
  | 'designation'
  | 'gst'
  | 'pan'
  | 'date'
  | 'phone'
  | 'email'
  | 'city'
  | 'address'
  | 'verification';

export type ContactRow = {
  /** Stable React key, unique within one profile. */
  key: string;
  kind: ContactRowKind;
  label: string;
  /** Plain text. Shown in full; long values (addresses) wrap. */
  value: string;
  /** Small pill after the value (e.g. 'Primary'). */
  tag?: ContactPill;
  /** When set, the value itself is shown as a pill of this tone. */
  valueTone?: ContactTone;
};

/** Icon in a section's heading. */
export type ContactSectionIcon = 'business' | 'contact' | 'verification';

export type ContactSection = {
  key: string;
  title: string;
  icon: ContactSectionIcon;
  /** Row icons on tinted circles (true) or plain grey outlines (false). */
  tintedIcons: boolean;
  rows: ContactRow[];
};

/** What every layout needs: the header, quick actions and messages. */
type ContactProfileBase = {
  /** Seed for the deterministic avatar colour. */
  id: string;
  /** Main heading: the person's name (the owner's name for vendors). */
  title: string;
  /** Optional second line under the title (e.g. vendor company name). */
  subtitle: string | null;
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
};

/** Centred header and one flat list of rows (customers, staff, drivers). */
export type ListContactProfile = ContactProfileBase & {
  layout: 'list';
  /** Small icon + text lines under the title (status, role…). */
  meta: ContactMeta[];
  fields: ContactField[];
};

/** Left-aligned header and titled sections of rows (vendors). */
export type SectionedContactProfile = ContactProfileBase & {
  layout: 'sections';
  /** Pill in the header (e.g. 'Active'). */
  status: ContactPill;
  sections: ContactSection[];
};

export type ContactProfile = ListContactProfile | SectionedContactProfile;
