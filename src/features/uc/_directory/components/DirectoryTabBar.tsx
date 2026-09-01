/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * DirectoryTabBar
 * ------------------------------------------------------------------
 * Custom tab bar for the Directory hub's material-top-tab navigator.
 *
 * Icons match the product mock:
 *   Customers → UsersRound (rounded two-people group, lucide)
 *   Vendors   → Store      (storefront with awning, lucide)
 *   UC Staff  → Contact    (ID card silhouette, lucide)
 *   Drivers   → inline steering-wheel SVG (lucide has no wheel icon,
 *              and we didn't want a separate icon file for one glyph)
 *
 * Layout:
 *   - Horizontal gutter (Spacing.md) so tabs don't hug screen edges.
 *   - Icon + label centered per equal-flex slot.
 *   - Active indicator is a FULL-WIDTH bar under the tab slot, sitting
 *     on the hairline bottom border → reads as a highlighted segment
 *     of a shared axis (the CRM/HubSpot pattern in the mock).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { UsersRound, Store, Contact } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';

type TabIconProps = { size: number; color: string; strokeWidth?: number };
type TabIcon = React.ComponentType<TabIconProps>;

/* -----------------------------------------------------------------
 * Inline steering-wheel icon
 * ----------------------------------------------------------------- */
const SteeringWheelIcon: React.FC<TabIconProps> = ({
  size = 20,
  color = '#000',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M12 3v7M4 10c2.5 1 5 1.5 8 1.5M20 10c-2.5 1-5 1.5-8 1.5M6 19c1.5-3 3.5-5 6-5M18 19c-1.5-3-3.5-5-6-5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ROUTE_ICONS: Record<string, TabIcon> = {
  DirectoryCustomers: UsersRound,
  DirectoryVendors: Store,
  DirectoryStaff: Contact,
  DirectoryDrivers: SteeringWheelIcon,
};

const ICON_SIZE = 20;
const ICON_STROKE = 2;
const INDICATOR_HEIGHT = 3;

export const DirectoryTabBar: React.FC<MaterialTopTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : route.name;
          const Icon: TabIcon = ROUTE_ICONS[route.name] ?? UsersRound;
          const tint = focused ? Colors.primary : Colors.textSecondary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              hitSlop={8}
              style={styles.item}
            >
              <View style={styles.content}>
                <Icon size={ICON_SIZE} color={tint} strokeWidth={ICON_STROKE} />
                <Text numberOfLines={1} style={[styles.label, { color: tint }]}>
                  {label}
                </Text>
              </View>

              {/* Full-width active indicator */}
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: focused ? Colors.primary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  item: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm + 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '700',
    includeFontPadding: false,
  },
  indicator: {
    height: INDICATOR_HEIGHT,
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
