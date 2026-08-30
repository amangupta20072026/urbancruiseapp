/**
 * ------------------------------------------------------------------
 * DirectoryScreen — the Directory hub
 * ------------------------------------------------------------------
 * Single screen with four top tabs: Customers / Vendors / UC Staff /
 * Drivers. Replaces the four scattered More-sheet entries with one
 * "Directory" entry that lands here.
 *
 * WHY MATERIAL TOP TABS:
 *   - Swipe-between-tabs is the CRM convention (HubSpot, Zoho).
 *   - Each tab keeps its own scroll position + filter state while the
 *     user swipes to another.
 *   - `@react-navigation/material-top-tabs` is already installed and
 *     used by the app's dependency tree.
 *
 * LAZY MOUNTING:
 *   lazy=true so we don't pay the network + render cost for tabs the
 *   user never visits. Each tab still keeps state after first mount
 *   (default), so returning to the tab is instant.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Spacing, Typography } from '@theme';

import CustomersTabScreen from '@features/uc/customers/screens/CustomersTabScreen';
import VendorsTabScreen from '@features/uc/vendors/screens/VendorsTabScreen';
import StaffTabScreen from '@features/uc/staff/screens/StaffTabScreen';
import DriversTabScreen from '@features/uc/drivers/screens/DriversTabScreen';

/**
 * Local param list — the Directory tabs live entirely inside this
 * screen, so they don't need to be part of UcStackParamList.
 */
export type DirectoryTabParamList = {
  DirectoryCustomers: undefined;
  DirectoryVendors: undefined;
  DirectoryStaff: undefined;
  DirectoryDrivers: undefined;
};

const Tab = createMaterialTopTabNavigator<DirectoryTabParamList>();

const tabOptions: MaterialTopTabNavigationOptions = {
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.textSecondary,
  tabBarLabelStyle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    textTransform: 'none',
  },
  tabBarIndicatorStyle: {
    backgroundColor: Colors.primary,
    height: 3,
    borderRadius: 2,
  },
  tabBarStyle: {
    backgroundColor: Colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBarScrollEnabled: false,
  lazy: true,
  swipeEnabled: true,
};

const DirectoryScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Directory"
          subtitle="Customers, vendors, teammates, and drivers — all in one place."
          onBack={() => navigation.goBack()}
        />
      </View>

      <Tab.Navigator screenOptions={tabOptions}>
        <Tab.Screen
          name="DirectoryCustomers"
          component={CustomersTabScreen}
          options={{ tabBarLabel: 'Customers' }}
        />
        <Tab.Screen
          name="DirectoryVendors"
          component={VendorsTabScreen}
          options={{ tabBarLabel: 'Vendors' }}
        />
        <Tab.Screen
          name="DirectoryStaff"
          component={StaffTabScreen}
          options={{ tabBarLabel: 'UC Staff' }}
        />
        <Tab.Screen
          name="DirectoryDrivers"
          component={DriversTabScreen}
          options={{ tabBarLabel: 'Drivers' }}
        />
      </Tab.Navigator>
    </SafeScreen>
  );
};

export default DirectoryScreen;

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
