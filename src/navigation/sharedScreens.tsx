// src/navigation/sharedScreens.tsx

/**
 * ------------------------------------------------------------------
 * renderSharedScreens — register a role's shared screens
 * ------------------------------------------------------------------
 * Every role navigator calls this once, inside its <Stack.Navigator>:
 *
 *   {renderSharedScreens(Stack, 'vendor')}
 *
 * It registers exactly the shared screens `SCREEN_ACCESS` grants that
 * role — no more, no less. Because the role's ParamList is built from
 * the same table (`SharedParamsFor<role>` in ./types.ts), what is
 * registered at runtime and what TypeScript allows always match.
 *
 * Returns an array of <Stack.Screen> elements. React Navigation reads
 * its children with React.Children.toArray, which flattens arrays, so
 * this is a supported way to register screens. (A wrapper COMPONENT
 * would not be — navigators only accept Screen, Group or Fragment as
 * direct children.)
 * ------------------------------------------------------------------
 */

import React from 'react';

import type { UserRole } from '@rbac/roles';
import { sharedScreensFor, type SharedScreen } from '@rbac/screenAccess';

import SupportScreen from '@features/shared/support/screens/SupportScreen';
import HelpSupportScreen from '@features/shared/support/screens/HelpSupportScreen';
import QuotationHelpScreen from '@features/shared/support/screens/QuotationHelpScreen';
import BookingHelpScreen from '@features/shared/support/screens/BookingHelpScreen';
import PaymentsHelpScreen from '@features/shared/support/screens/PaymentsHelpScreen';
import AccountHelpScreen from '@features/shared/support/screens/AccountHelpScreen';
import SafetyHelpScreen from '@features/shared/support/screens/SafetyHelpScreen';
import FeedbackHelpScreen from '@features/shared/support/screens/FeedbackHelpScreen';
import { ProfileScreen } from '@features/shared/profile';
import {
  SettingsScreen,
  NotificationPreferencesScreen,
  AboutUrbanCruiseScreen,
} from '@features/shared/settings';
import { NotificationCentreScreen } from '@features/shared/notifications';

/**
 * The component for each shared screen. `Record<SharedScreen, …>`
 * makes a missing component a compile error when a screen is added
 * to SharedStackParamList.
 */
const SHARED_SCREEN_COMPONENTS: Readonly<
  Record<SharedScreen, React.ComponentType>
> = {
  Settings: SettingsScreen,
  Support: SupportScreen,
  AboutUrbanCruise: AboutUrbanCruiseScreen,
  Profile: ProfileScreen,
  NotificationCentre: NotificationCentreScreen,
  HelpSupport: HelpSupportScreen,
  QuotationHelp: QuotationHelpScreen,
  BookingHelp: BookingHelpScreen,
  PaymentsHelp: PaymentsHelpScreen,
  AccountHelp: AccountHelpScreen,
  SafetyHelp: SafetyHelpScreen,
  FeedbackHelp: FeedbackHelpScreen,
  NotificationPreferences: NotificationPreferencesScreen,
};

/**
 * The navigator's `Stack` object. Only `Screen` is used; it is typed
 * loosely here because each role's Stack is generic over a different
 * ParamList. Correctness is guaranteed by construction: the screens
 * rendered and the role's ParamList both come from SCREEN_ACCESS.
 */
type StackWithScreen = { Screen: React.ElementType };

export function renderSharedScreens(
  Stack: StackWithScreen,
  role: UserRole,
): React.ReactElement[] {
  return sharedScreensFor(role).map(name => (
    <Stack.Screen
      key={name}
      name={name}
      component={SHARED_SCREEN_COMPONENTS[name]}
    />
  ));
}
