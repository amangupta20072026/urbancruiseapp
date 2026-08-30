// src/navigation/OnboardingNavigator.tsx
/**
 * ------------------------------------------------------------------
 * OnboardingNavigator
 * ------------------------------------------------------------------
 * SplashIntroScreen has been PROMOTED to the root level (RootNavigator)
 * where it acts as the bootstrap gate. This navigator now only
 * contains the actual onboarding UI.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../features/auth/OnboardingScreen';
import type { OnboardingParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingParamList>();

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;