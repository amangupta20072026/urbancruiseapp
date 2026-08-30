import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Mail, MapPin, ShieldCheck } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { avatarColorFor, initials } from '@features/uc/_directory';

import { STAFF_SUBROLE_LABEL, type Staff } from '../types';

type Props = { staff: Staff; onPress: (s: Staff) => void };

export const StaffCard: React.FC<Props> = ({ staff, onPress }) => {
  const c = avatarColorFor(staff.id);

  return (
    <Pressable
      onPress={() => onPress(staff)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        !staff.active && styles.inactive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Staff ${staff.name}. Tap for contact actions.`}
    >
      <View style={[styles.avatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.avatarText, { color: c.fg }]}>
          {initials(staff.name)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {staff.name}
          </Text>
          {!staff.active && (
            <View style={styles.inactivePill}>
              <Text style={styles.inactivePillText}>Inactive</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <ShieldCheck size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {STAFF_SUBROLE_LABEL[staff.subRole]}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <MapPin size={13} color={Colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {staff.city}
            </Text>
          </View>

          <View style={styles.sep} />

          <View style={styles.footerRight}>
            <Mail size={13} color={Colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {staff.email}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color={Colors.textTertiary} />
    </Pressable>
  );
};

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
  inactive: { opacity: 0.6 },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  inactivePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
  },
  inactivePillText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  sep: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
});
