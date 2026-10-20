// src/features/shared/settings/settingsMenu.ts

/**
 * ------------------------------------------------------------------
 * Settings menu — role-based cards in groups (PURE DATA)
 * ------------------------------------------------------------------
 * What the Settings screen shows, per role. Same design as the More
 * sheet (moreMenuConfig.tsx): this file holds only data — labels,
 * icons, colours, group and who may see each card. Behaviour (what a
 * tap does) stays in SettingsScreen's `handleRow`.
 *
 * WHO SEES A CARD — exactly one rule per card:
 *   - `screen`: the card opens a shared screen, so it is visible only
 *     when `canAccess(role, screen)` is true. Access therefore comes
 *     from SCREEN_ACCESS (src/rbac/screenAccess.ts) — the card can
 *     never point at a screen the role doesn't have.
 *   - `roles`: the card doesn't open a shared screen (toggle, OS
 *     settings, external link, …), so it lists its roles directly.
 *     Exception: Notifications is listed by role although it opens a
 *     shared screen — every role sees the card, and a role whose
 *     navigator doesn't have the screen yet gets the "Coming soon"
 *     toast (SettingsScreen uses navigateOrComingSoon). Adding the
 *     role to SCREEN_ACCESS later makes the card open it, no change
 *     here.
 *
 * SUBTITLES: one `subtitle` for every role, optionally replaced per
 * role by `subtitleByRole` (e.g. a vendor's Personal Information
 * leaves out date of birth).
 *
 * Groups render in GROUP_ORDER; a group with no visible cards is not
 * rendered.
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  IdCard,
  Info,
  Landmark,
  Languages,
  Palette,
  Phone,
  Shield,
  Trash2,
  User,
  type LucideProps,
} from 'lucide-react-native';

import { Colors } from '@theme';
import type { UserRole } from '@rbac/roles';
import { canAccess, type SharedScreen } from '@rbac/screenAccess';

/* -----------------------------------------------------------------
 * Local colour pairs — purple / pink have no theme tokens yet.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';
const PINK_FG = '#EC4899';
const PINK_BG = '#FCE7F3';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

/** Stable id per card. SettingsScreen's `handleRow` switches on it. */
export type SettingsRowId =
  | 'personalInfo'
  | 'savedPayments'
  | 'businessDetails'
  | 'payoutAccount'
  | 'licenceDocuments'
  | 'notifications'
  | 'language'
  | 'appearance'
  | 'permissions'
  | 'termsConditions'
  | 'aboutApp'
  | 'helpSupport'
  | 'contactSupport'
  | 'deleteAccount';

export type SettingsGroup = 'account' | 'preferences' | 'supportLegal';

/** Exactly one access rule per card — see file header. */
type Access =
  | { readonly screen: SharedScreen; readonly roles?: never }
  | { readonly roles: readonly UserRole[]; readonly screen?: never };

type RowDefinition = Access & {
  readonly id: SettingsRowId;
  readonly group: SettingsGroup;
  readonly title: string;
  /** Static text, or built from context (e.g. the app version). */
  readonly subtitle: string | ((ctx: SettingsContext) => string);
  /** Replaces `subtitle` for the roles listed. */
  readonly subtitleByRole?: Readonly<Partial<Record<UserRole, string>>>;
  readonly Icon: ComponentType<LucideProps>;
  readonly iconFg: string;
  readonly iconBg: string;
  /** Renders the title in error red (Delete Account). */
  readonly destructive?: boolean;
};

/** A card ready to render. */
export type SettingsRow = {
  readonly id: SettingsRowId;
  readonly title: string;
  readonly subtitle: string;
  readonly Icon: ComponentType<LucideProps>;
  readonly iconFg: string;
  readonly iconBg: string;
  readonly destructive?: boolean;
};

export type SettingsSection = {
  readonly key: SettingsGroup;
  readonly label: string;
  readonly rows: readonly SettingsRow[];
};

/** Runtime values some subtitles need. */
export type SettingsContext = {
  readonly appVersion: string;
};

/* -----------------------------------------------------------------
 * Groups
 * ----------------------------------------------------------------- */

const GROUP_ORDER: readonly SettingsGroup[] = [
  'account',
  'preferences',
  'supportLegal',
];

const GROUP_LABEL: Readonly<Record<SettingsGroup, string>> = {
  account: 'Account Settings',
  preferences: 'App Preferences',
  supportLegal: 'Support & Legal',
};

const ALL_ROLES = ['customer', 'vendor', 'driver', 'uc'] as const;
/** Everyone except UC staff, whose accounts are managed by an admin. */
const FIELD_ROLES = ['customer', 'vendor', 'driver'] as const;

/* -----------------------------------------------------------------
 * Cards (render order within each group)
 * ----------------------------------------------------------------- */

const ROWS: readonly RowDefinition[] = [
  // ── Account ────────────────────────────────────────────────────
  {
    id: 'personalInfo',
    group: 'account',
    screen: 'Profile',
    title: 'Personal Information',
    subtitle: 'Name, mobile number, email, date of birth',
    subtitleByRole: {
      vendor: 'Owner name, mobile number, email',
      uc: 'Name, mobile number, email',
    },
    Icon: User,
    iconFg: Colors.info,
    iconBg: Colors.infoTint,
  },
  {
    // Only customers pay in the app; other roles have no saved methods.
    id: 'savedPayments',
    group: 'account',
    roles: ['customer'],
    title: 'Saved Payment Methods',
    subtitle: 'Cards, UPI, wallets',
    Icon: CreditCard,
    iconFg: Colors.accent,
    iconBg: Colors.accentTint,
  },
  {
    // The vendor's company record: the same fields UC sees on the
    // vendor contact sheet.
    id: 'businessDetails',
    group: 'account',
    roles: ['vendor'],
    title: 'Business Details',
    subtitle: 'Company name, GST, PAN, business type, address',
    Icon: Building2,
    iconFg: Colors.secondaryOnTint,
    iconBg: Colors.secondaryTint,
  },
  {
    // Vendors receive money instead of paying: their counterpart of
    // Saved Payment Methods.
    id: 'payoutAccount',
    group: 'account',
    roles: ['vendor'],
    title: 'Payout Account',
    subtitle: 'Bank account and UPI for your payouts',
    Icon: Landmark,
    iconFg: Colors.accent,
    iconBg: Colors.accentTint,
  },
  {
    id: 'licenceDocuments',
    group: 'account',
    roles: ['driver'],
    title: 'Licence & Documents',
    subtitle: 'Driving licence and ID documents',
    Icon: IdCard,
    iconFg: Colors.secondaryOnTint,
    iconBg: Colors.secondaryTint,
  },

  // ── Preferences ────────────────────────────────────────────────
  {
    // Listed by role, not by screen: see "Exception" in the header.
    id: 'notifications',
    group: 'preferences',
    roles: ALL_ROLES,
    title: 'Notifications',
    subtitle: 'Manage your notification preferences',
    subtitleByRole: {
      vendor: 'Booking assignments, trip and payout alerts',
      driver: 'Trip assignments and trip updates',
      uc: 'New enquiries, quotation and trip alerts',
    },
    Icon: Bell,
    iconFg: PURPLE_FG,
    iconBg: PURPLE_BG,
  },
  {
    id: 'language',
    group: 'preferences',
    roles: ALL_ROLES,
    title: 'Language',
    // Placeholder until i18n ships.
    subtitle: 'English',
    Icon: Languages,
    iconFg: Colors.primary,
    iconBg: Colors.primaryTint,
  },
  {
    id: 'appearance',
    group: 'preferences',
    roles: ALL_ROLES,
    title: 'Appearance',
    subtitle: 'Light mode / Dark mode / System default',
    Icon: Palette,
    iconFg: PINK_FG,
    iconBg: PINK_BG,
  },
  {
    id: 'permissions',
    group: 'preferences',
    roles: ALL_ROLES,
    title: 'Permissions',
    subtitle: 'Camera, location, notifications and more',
    // Drivers share their live location, so it comes first for them.
    subtitleByRole: {
      driver: 'Location, camera, notifications and more',
    },
    Icon: Shield,
    iconFg: Colors.info,
    iconBg: Colors.infoTint,
  },

  // ── Support & Legal ────────────────────────────────────────────
  {
    id: 'termsConditions',
    group: 'supportLegal',
    roles: ALL_ROLES,
    title: 'Terms & Conditions',
    subtitle: 'Read our terms and policies',
    Icon: FileText,
    iconFg: PURPLE_FG,
    iconBg: PURPLE_BG,
  },
  {
    id: 'aboutApp',
    group: 'supportLegal',
    screen: 'AboutUrbanCruise',
    title: 'About Urban Cruise',
    subtitle: ctx => `App version ${ctx.appVersion}`,
    Icon: Info,
    iconFg: Colors.accent,
    iconBg: Colors.accentTint,
  },
  {
    // Full help hub (FAQ topics + contact) — roles with HelpSupport.
    id: 'helpSupport',
    group: 'supportLegal',
    screen: 'HelpSupport',
    title: 'Help & Support',
    subtitle: 'Get help, FAQs and contact us',
    Icon: HelpCircle,
    iconFg: Colors.info,
    iconBg: Colors.infoTint,
  },
  {
    // UC staff have no help hub (see SCREEN_ACCESS), so they get the
    // direct contact screen instead. Listed by role, not by screen,
    // because every role can open Support — only UC needs this card.
    id: 'contactSupport',
    group: 'supportLegal',
    roles: ['uc'],
    title: 'Contact Support',
    subtitle: 'Call, WhatsApp or email the support team',
    Icon: Phone,
    iconFg: Colors.info,
    iconBg: Colors.infoTint,
  },
  {
    // UC staff accounts are created and closed by an admin, not by
    // the staff member.
    id: 'deleteAccount',
    group: 'supportLegal',
    roles: FIELD_ROLES,
    title: 'Delete Account',
    subtitle: 'Permanently delete your account and data',
    Icon: Trash2,
    iconFg: Colors.error,
    iconBg: Colors.errorTint,
    destructive: true,
  },
];

/* -----------------------------------------------------------------
 * Builder
 * ----------------------------------------------------------------- */

function isVisible(row: RowDefinition, role: UserRole | null): boolean {
  if (!role) return false; // fail closed
  if (row.screen !== undefined) return canAccess(role, row.screen);
  return row.roles.includes(role);
}

function subtitleFor(
  row: RowDefinition,
  role: UserRole,
  ctx: SettingsContext,
): string {
  const own = row.subtitleByRole?.[role];
  if (own !== undefined) return own;
  return typeof row.subtitle === 'function' ? row.subtitle(ctx) : row.subtitle;
}

/**
 * The Settings sections for `role`, in display order. Groups with no
 * visible cards are omitted. Returns [] when there is no role.
 */
export function buildSettingsSections(
  role: UserRole | null,
  ctx: SettingsContext,
): SettingsSection[] {
  if (!role) return []; // fail closed
  const visible = ROWS.filter(row => isVisible(row, role));

  return GROUP_ORDER.map(group => ({
    key: group,
    label: GROUP_LABEL[group],
    rows: visible
      .filter(row => row.group === group)
      .map(
        (row): SettingsRow => ({
          id: row.id,
          title: row.title,
          subtitle: subtitleFor(row, role, ctx),
          Icon: row.Icon,
          iconFg: row.iconFg,
          iconBg: row.iconBg,
          destructive: row.destructive,
        }),
      ),
  })).filter(section => section.rows.length > 0);
}
