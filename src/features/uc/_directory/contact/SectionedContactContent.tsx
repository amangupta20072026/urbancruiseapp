/**
 * ------------------------------------------------------------------
 * SectionedContactContent — the 'sections' contact-sheet layout
 * ------------------------------------------------------------------
 * Used for vendors. Layout, top to bottom:
 *
 *   [Avatar]  Owner name                                   (×)
 *             Company name
 *             (✓ Active)
 *   [ Call ]  [ WhatsApp ]  [ Email ]        ← bordered cards
 *   ▣ Basic Information   (rows, plain grey icons): company,
 *                         designation, GST, PAN, vendor since
 *   ☎ Contact Information (rows, icons on tinted circles)
 *   ⛨ Verification        (status shown as a pill)
 *   Cancel
 *
 * Every row is label | value. Values are never cut short: long ones
 * (addresses, emails) wrap. Emails may wrap only after the '@' (see
 * emailDisplay), never in the middle of a word. Which rows exist, and in what order, is
 * decided in profiles.ts; this file only draws them.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BriefcaseBusiness,
  Building,
  Building2,
  Calendar,
  IdCard,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import { avatarColorFor, initials } from '../../customers/utils/avatar';
import {
  CancelButton,
  CloseButton,
  QuickActions,
  StatusPill,
  TagPill,
  type ContactActions,
} from './contactVisuals';
import type {
  ContactRow,
  ContactRowKind,
  ContactSection,
  ContactSectionIcon,
  SectionedContactProfile,
} from './types';

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

const SECTION_ICON: Record<ContactSectionIcon, LucideIcon> = {
  business: Building2,
  contact: Phone,
  verification: ShieldCheck,
};

/** Icon per row kind, plus its colours on a tinted circle. In a
 *  section without tinted icons, only `Icon` is used (in grey). */
const ROW_STYLE: Record<
  ContactRowKind,
  { Icon: LucideIcon; bg: string; fg: string }
> = {
  company: { Icon: Store, bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  designation: {
    Icon: BriefcaseBusiness,
    bg: Colors.surfaceMuted,
    fg: Colors.textSecondary,
  },
  gst: { Icon: Building, bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  pan: { Icon: IdCard, bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  date: { Icon: Calendar, bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  phone: { Icon: Phone, bg: Colors.primaryTint, fg: Colors.success },
  email: { Icon: Mail, bg: '#FFF1E0', fg: '#FB8C00' },
  city: { Icon: MapPin, bg: '#EDF2FF', fg: '#3B82F6' },
  address: { Icon: MapIcon, bg: '#EDF2FF', fg: '#3B82F6' },
  verification: {
    Icon: ShieldCheck,
    bg: Colors.primaryTint,
    fg: Colors.success,
  },
};

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

type Props = ContactActions & { profile: SectionedContactProfile };

export const SectionedContactContent: React.FC<Props> = ({
  profile,
  onCall,
  onWhatsApp,
  onEmail,
  onClose,
}) => {
  const avatar = avatarColorFor(profile.id);

  return (
    <View>
      <CloseButton onPress={onClose} />

      {/* Header: avatar left, name / company / status right. */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.avatarText, { color: avatar.fg }]}>
            {initials(profile.title)}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text
            style={styles.name}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {profile.title}
          </Text>
          {profile.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {profile.subtitle}
            </Text>
          ) : null}
          <View style={styles.statusRow}>
            <StatusPill pill={profile.status} />
          </View>
        </View>
      </View>

      <QuickActions
        variant="card"
        hasPhone={profile.phones.length > 0}
        hasEmail={profile.email !== null}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
        onEmail={onEmail}
      />

      {profile.sections.map(section =>
        section.rows.length > 0 ? (
          <Section key={section.key} section={section} />
        ) : null,
      )}

      <CancelButton onPress={onClose} />
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

const Section: React.FC<{ section: ContactSection }> = ({ section }) => {
  const SectionIcon = SECTION_ICON[section.icon];
  const lastIndex = section.rows.length - 1;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SectionIcon size={22} color={Colors.textPrimary} strokeWidth={1.8} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {section.title}
        </Text>
      </View>
      <View style={styles.sectionCard}>
        {section.rows.map((row, i) => (
          <Row
            key={row.key}
            row={row}
            tinted={section.tintedIcons}
            last={i === lastIndex}
          />
        ))}
      </View>
    </View>
  );
};

/** Zero-width space: an invisible point where a line may break. */
const ZWSP = '\u200B';

/**
 * An email has no spaces, so Android treats it as one long word and,
 * when it is wider than the column, splits it at arbitrary letters
 * ('contact@hi / ghwaykings / .in'). A break point after the '@' lets
 * it wrap as 'contact@ / highwaykings.in'. Display only: the
 * accessibility label and the Email action use the plain address.
 */
const emailDisplay = (value: string): string => value.replace('@', `@${ZWSP}`);

const Row: React.FC<{ row: ContactRow; tinted: boolean; last: boolean }> = ({
  row,
  tinted,
  last,
}) => {
  const { Icon, bg, fg } = ROW_STYLE[row.kind];
  const a11yLabel = [`${row.label}: ${row.value}`, row.tag?.label]
    .filter(Boolean)
    .join(', ');
  return (
    <View style={styles.row} accessible accessibilityLabel={a11yLabel}>
      {tinted ? (
        <View style={[styles.rowIconCircle, { backgroundColor: bg }]}>
          <Icon size={18} color={fg} strokeWidth={2} />
        </View>
      ) : (
        <View style={styles.rowIconPlain}>
          <Icon size={20} color={Colors.textSecondary} strokeWidth={1.8} />
        </View>
      )}

      {/* Divider sits under the text only, not under the icon. */}
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <View style={styles.rowValueWrap}>
          {row.valueTone ? (
            <StatusPill pill={{ label: row.value, tone: row.valueTone }} />
          ) : (
            <Text style={styles.rowValue}>
              {row.kind === 'email' ? emailDisplay(row.value) : row.value}
            </Text>
          )}
          {row.tag ? <TagPill pill={row.tag} /> : null}
        </View>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const ICON_SLOT = 36;

const styles = StyleSheet.create({
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingLeft: Spacing.lg,
    // Keeps long names clear of the × button.
    paddingRight: Spacing.huge + Spacing.sm,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.h3, fontWeight: '800' },
  headerText: { flex: 1, gap: Spacing.xs },
  name: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },

  /* Sections */
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing.md,
  },

  /* Rows */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowIconCircle: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    borderRadius: ICON_SLOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconPlain: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLabel: {
    flex: 2,
    ...Typography.body,
    color: Colors.textSecondary,
  },
  rowValueWrap: {
    flex: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
  },
});
