/**
 * ------------------------------------------------------------------
 * DirectoryCard — ONE list row for every directory role
 * ------------------------------------------------------------------
 * Replaces CustomerCard, VendorCard, StaffCard and DriverCard. The
 * layout is identical for all roles; what goes in each slot comes
 * from toCardModel() (cardModel.ts).
 *
 *   - Title is never truncated: it wraps onto as many lines as needed.
 *   - The badge (customer-style rounded pill) sits in a slot exactly
 *     one title-line tall, so it stays centred on the FIRST line.
 *   - Lines marked `chip` (company names) get a neutral slate tint
 *     that hugs the text. The name is never shortened: a long one
 *     wraps onto more lines. A chip suffix (city) follows a map-pin
 *     icon, on the same line when it fits, otherwise on the next.
 *
 * Performance: memoised on (kind, data identity, onPress). Screens
 * create `{ kind, data }` inline in renderItem, so a plain shallow
 * memo would never hit — the custom comparator compares the record
 * itself instead of the wrapper object.
 *
 * Usage:
 *   <DirectoryCard contact={{ kind: 'vendor', data: item }} onPress={onRowPress} />
 * ------------------------------------------------------------------
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import { avatarColorFor, initials } from '../../customers/utils/avatar';
import type { DirectoryContact } from '../contact/types';
import { toCardModel, type CardFooterItem, type CardIcon } from './cardModel';

type Props = {
  contact: DirectoryContact;
  /** Receives the same typed contact, ready for DirectoryContactSheet. */
  onPress: (contact: DirectoryContact) => void;
};

const ICON: Record<CardIcon, LucideIcon> = {
  phone: Phone,
  mail: Mail,
  calendar: Calendar,
  trips: Briefcase,
  company: Building2,
  location: MapPin,
};

const DirectoryCardComponent: React.FC<Props> = ({ contact, onPress }) => {
  const model = useMemo(() => toCardModel(contact), [contact]);
  const avatar = avatarColorFor(model.id);
  const handlePress = useCallback(() => onPress(contact), [onPress, contact]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint={model.accessibilityHint}
    >
      <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
        <Text style={[styles.avatarText, { color: avatar.fg }]}>
          {initials(model.title)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          {/* Full title — wraps, never truncated. */}
          <Text style={styles.title}>{model.title}</Text>
          {model.badge ? (
            <View style={styles.badgeSlot}>
              <View style={[styles.badge, { backgroundColor: model.badge.bg }]}>
                <Text style={[styles.badgeText, { color: model.badge.fg }]}>
                  {model.badge.label}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {model.lines.map(line => {
          const LineIcon = ICON[line.icon];
          if (line.chip) {
            return (
              <View key={line.key} style={styles.chip}>
                {/* One text-line tall: the icon stays on the FIRST line
                    when the name wraps. */}
                <View style={styles.chipIconSlot}>
                  <LineIcon size={13} color={Colors.companyChipText} />
                </View>
                {/* Name and city wrap as two pieces: the city moves to
                    the next line when it doesn't fit after the name. */}
                <View style={styles.chipBody}>
                  <Text style={styles.chipText}>{line.text}</Text>
                  {line.suffix ? (
                    <View style={styles.chipSuffix}>
                      <MapPin size={13} color={Colors.companyChipText} />
                      <Text style={styles.chipText}>{line.suffix}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }
          return (
            <View key={line.key} style={styles.metaRow}>
              {/* One text-line tall, so the icon stays on the FIRST line
                  when the text wraps (e.g. a long address). */}
              <View style={styles.metaIconSlot}>
                <LineIcon size={13} color={Colors.textSecondary} />
              </View>
              <Text
                style={styles.metaText}
                numberOfLines={line.wrap ? undefined : 1}
              >
                {line.text}
              </Text>
            </View>
          );
        })}

        {model.footer ? (
          <View style={styles.footerRow}>
            <FooterItem item={model.footer.left} gap={6} />
            <View style={styles.sep} />
            <FooterItem item={model.footer.right} gap={4} />
          </View>
        ) : null}
      </View>

      <ChevronRight size={20} color={Colors.textTertiary} />
    </Pressable>
  );
};

const FooterItem: React.FC<{ item: CardFooterItem; gap: number }> = ({
  item,
  gap,
}) => {
  const FooterIcon = ICON[item.icon];
  const color = item.emphasis ? Colors.success : Colors.textSecondary;
  return (
    <View
      style={[
        styles.footerItem,
        item.shrink ? styles.footerItemShrink : styles.footerItemFixed,
        { gap },
      ]}
    >
      <FooterIcon size={13} color={color} />
      <Text
        style={[styles.footerText, item.emphasis && styles.footerEmphasis]}
        numberOfLines={1}
      >
        {item.text}
      </Text>
    </View>
  );
};

/** Re-render only when the underlying record or handler changes. */
const areEqual = (prev: Props, next: Props): boolean =>
  prev.onPress === next.onPress &&
  prev.contact.kind === next.contact.kind &&
  prev.contact.data === next.contact.data;

export const DirectoryCard = memo(DirectoryCardComponent, areEqual);
DirectoryCard.displayName = 'DirectoryCard';

/* ------------------------------------------------------------------ */
/* Styles (carried over from the former cards)                        */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, fontWeight: '700' },
  body: { flex: 1, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  /* One title-line tall: keeps the badge centred on the FIRST line of
   * the title, however many lines the title wraps to. */
  badgeSlot: {
    height: Typography.subtitle.lineHeight,
    justifyContent: 'center',
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: { ...Typography.caption, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaIconSlot: {
    height: Typography.bodySmall.lineHeight,
    justifyContent: 'center',
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  /* Hugs its text (alignSelf) but never wider than the column. */
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: Colors.companyChipBg,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: Spacing.xxs,
  },
  chipIconSlot: {
    height: Typography.bodySmall.lineHeight,
    justifyContent: 'center',
  },
  chipBody: {
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: Spacing.xxs,
  },
  chipText: {
    ...Typography.bodySmall,
    color: Colors.companyChipText,
    fontWeight: '500',
    flexShrink: 1,
  },
  /* Pin + city. Wraps as one piece; shrinks only if the city alone is
   * wider than the chip, and then its text wraps too. */
  chipSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    flexShrink: 1,
    maxWidth: '100%',
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  /* Shortens with "…" when space runs out. */
  footerItemShrink: { flexShrink: 1, minWidth: 0 },
  /* Always shown in full. */
  footerItemFixed: { flexShrink: 0 },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footerEmphasis: { color: Colors.success, fontWeight: '600' },
  sep: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
});
