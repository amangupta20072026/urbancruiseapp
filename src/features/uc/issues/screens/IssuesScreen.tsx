/**
 * ------------------------------------------------------------------
 * IssuesScreen (UC) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the UC More sheet. Placeholder until issue tracking
 * (raised, in-progress, resolved + SLA) ships.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const IssuesScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Issues"
          subtitle="Track escalations, tickets, and SLA breaches."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Issues" Icon={AlertTriangle} />
    </SafeScreen>
  );
};

export default IssuesScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});