/**
 * ------------------------------------------------------------------
 * LotusDivider — the mark that closes the list
 * ------------------------------------------------------------------
 * A lotus between two rules, as in the design's footer. Purely
 * decorative: it signals the end of the list, so it is hidden from
 * screen readers entirely rather than announced as an image.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Spacing } from '@theme';

const SIZE = 34;

export const LotusDivider: React.FC = () => (
  <View
    style={styles.row}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <View style={styles.rule} />

    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24">
      {/* Centre petal */}
      <Path
        d="M12 4 C14.4 7.6 14.4 12.4 12 16 C9.6 12.4 9.6 7.6 12 4 Z"
        fill={Colors.primaryDark}
      />
      {/* Inner petals */}
      <Path
        d="M12 16 C8.8 15.2 6 12.4 5.2 8.8 C8.4 9.2 11.2 12 12 16 Z"
        fill={Colors.primary}
      />
      <Path
        d="M12 16 C15.2 15.2 18 12.4 18.8 8.8 C15.6 9.2 12.8 12 12 16 Z"
        fill={Colors.primary}
      />
      {/* Outer petals */}
      <Path
        d="M12 16.8 C8.4 17.2 4.8 15.6 2.4 12.4 C5.6 11.6 9.6 13.2 12 16.8 Z"
        fill={Colors.primaryLight}
      />
      <Path
        d="M12 16.8 C15.6 17.2 19.2 15.6 21.6 12.4 C18.4 11.6 14.4 13.2 12 16.8 Z"
        fill={Colors.primaryLight}
      />
    </Svg>

    <View style={styles.rule} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.primaryLight,
  },
});
