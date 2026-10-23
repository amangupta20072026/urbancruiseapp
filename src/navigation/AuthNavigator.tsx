// src/navigation/AuthNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/LoginScreen';
import OtpVerifyScreen from '../features/auth/OtpVerifyScreen';
import CustomerProfileSetupScreen from '../features/auth/CustomerProfileSetupScreen';
import SupportScreen from '../features/shared/support/screens/SupportScreen';
import { useAppSelector } from '../store/hooks';
import type { AuthParamList } from './types';

const Stack = createNativeStackNavigator<AuthParamList>();

const AuthNavigator: React.FC = () => {
  const selectedRole = useAppSelector(s => s.app.selectedRole) ?? 'customer';

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={{
          role: selectedRole,
        }}
      />

      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />

      {/* No back: the onboarding ticket is single-use and the OTP is
          already spent. The screen also blocks Android hardware back. */}
      <Stack.Screen
        name="CustomerProfileSetup"
        component={CustomerProfileSetupScreen}
        options={{ gestureEnabled: false }}
      />

      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
