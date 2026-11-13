/**
 * ------------------------------------------------------------------
 * AnnouncementList — the "Announcements" card on the Workplace home
 * ------------------------------------------------------------------
 * Megaphone icon, title, body and the posted date, on a tinted panel.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Megaphone } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import type { WorkplaceAnnouncement } from '../types';

/** '10 Aug 2026'. An unparseable date renders as the raw value. */
function formatPosted(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const AnnouncementList: React.FC<{
  announcements: WorkplaceAnnouncement[];
}> = ({ announcements }) => {
  if (announcements.length === 0) {
    return <Text style={styles.empty}>Nothing new right now.</Text>;
  }

  return (
    <View style={styles.stack}>
      {announcements.map(item => (
        <View key={item.id} style={styles.panel}>
          <View style={styles.iconWrap}>
            <Megaphone size={18} color={Colors.primary} />
          </View>

          <View style={styles.main}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.dateRow}>
              <CalendarDays size={13} color={Colors.textTertiary} />
              <Text style={styles.date}>{formatPosted(item.postedOn)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { gap: Spacing.sm },
  panel: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.greenWash,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  main: { flex: 1 },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  body: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  date: { ...Typography.caption, color: Colors.textTertiary },
  empty: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    paddingVertical: Spacing.md,
  },
});
