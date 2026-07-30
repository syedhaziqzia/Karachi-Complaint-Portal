import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 150,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Welcome"          component={WelcomeScreen} />
      <Stack.Screen name="Login"            component={LoginScreen} />
      <Stack.Screen name="SignUp"           component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ResetPassword"   component={ResetPasswordScreen} />
      {/* MainTabs is handled by App.js RootNavigator — kept here only for backward compat */}
    </Stack.Navigator>
  );
};

export default AuthNavigator;
