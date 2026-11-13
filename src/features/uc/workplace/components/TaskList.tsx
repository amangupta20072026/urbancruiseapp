/**
 * ------------------------------------------------------------------
 * TaskList — the "My Tasks" card on the Workplace home
 * ------------------------------------------------------------------
 * Checkbox, title, due date and a priority pill per row.
 *
 * The checkbox is DISPLAY ONLY while this screen runs on fixture
 * data — there is nowhere to persist a tick. It is rendered
 * non-interactive rather than appearing to work and silently losing
 * the change on the next render.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Square } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import { PRIORITY_STYLE, type WorkplaceTask } from '../types';

/** '12 Aug 2026'. An unparseable date renders as the raw value. */
function formatDue(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const TaskList: React.FC<{ tasks: WorkplaceTask[] }> = ({ tasks }) => {
  if (tasks.length === 0) {
    return <Text style={styles.empty}>No tasks right now.</Text>;
  }

  return (
    <View>
      {tasks.map((task, index) => {
        const priority = PRIORITY_STYLE[task.priority];
        return (
          <View
            key={task.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
          >
            <Square size={20} color={Colors.border} />

            <View style={styles.main}>
              <Text style={styles.title} numberOfLines={2}>
                {task.title}
              </Text>
              <View style={styles.dueRow}>
                <CalendarDays size={13} color={Colors.textTertiary} />
                <Text style={styles.due}>Due: {formatDue(task.dueOn)}</Text>
              </View>
            </View>

            <View style={[styles.pill, { backgroundColor: priority.bg }]}>
              <Text style={[styles.pillText, { color: priority.fg }]}>
                {priority.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  main: { flex: 1 },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  due: { ...Typography.caption, color: Colors.textSecondary },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  pillText: { ...Typography.caption, fontWeight: '600' },
  empty: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    paddingVertical: Spacing.md,
  },
});
