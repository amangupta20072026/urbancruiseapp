// src/navigation/AuthNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/LoginScreen';
import OtpVerifyScreen from '../features/auth/OtpVerifyScreen';
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

      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;