/**
 * ------------------------------------------------------------------
 * CustomerFeedbackScreen — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the Customer More sheet ("Feedback" tile). General
 * feedback form — NOT tied to any specific booking. Distinct from
 * the booking-scoped `Feedback` route (which lives under Bookings
 * for post-trip rating flows).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageSquare } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const CustomerFeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Feedback"
          subtitle="Tell us what you think about the app."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Feedback" Icon={MessageSquare} />
    </SafeScreen>
  );
};

export default CustomerFeedbackScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});