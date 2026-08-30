/**
 * ------------------------------------------------------------------
 * NotificationCentreScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role placeholder for the notification centre. Reached from:
 *   - the More sheet's "Notifications" tile (every role)
 *   - the bell icon on role dashboards (e.g. UC DashboardHeader)
 *
 * Real UI will surface the notification list + read/unread + deep
 * links into role-appropriate destinations.
 *
 * REGISTRATION:
 *   Every role stack registers this component under the route name
 *   "NotificationCentre" (previously the same name was registered
 *   against NoImplementedScreen as a dev ghost — this real screen
 *   replaces that mapping wherever the ComingSoon UX is desired).
 *
 * WHY IT LIVES IN /shared/:
 *   Notifications behave the same for every role today. Role-aware
 *   filtering, if needed later, is a branch inside this component
 *   (via role from Redux) — not a per-role fork.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const NotificationCentreScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Notifications"
          subtitle="Alerts, approvals, and system updates."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Notifications" Icon={Bell} />
    </SafeScreen>
  );
};

export default NotificationCentreScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});
