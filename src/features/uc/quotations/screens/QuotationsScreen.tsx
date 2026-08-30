/**
 * ------------------------------------------------------------------
 * QuotationsScreen (UC) — TAB ROOT
 * ------------------------------------------------------------------
 * Landing screen for the UC "Quotations" tab. Currently a
 * ComingSoon placeholder; when the real UI ships, replace the
 * ComingSoon body with the quotation list + filters + create CTA.
 * No navigator wiring changes required at that point — this file
 * is the swap point.
 *
 * Tab roots render NO back chevron — the ScreenHeader is used only
 * for the title/subtitle here.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const QuotationsScreen: React.FC = () => {
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Quotations"
          subtitle="Draft, revise, and share customer quotations."
        />
      </View>
      <ComingSoon feature="Quotations" Icon={FileText} />
    </SafeScreen>
  );
};

export default QuotationsScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});