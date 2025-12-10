import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AllHealthDataScreen from '../screens/AllHealthDataScreen';
import WaterIntakeScreen from '../screens/WaterIntakeScreen';
import SleepScreen from '../screens/SleepScreen';
import PeriodCycleScreen from '../screens/PeriodCycleScreen';
import AIChatScreen from '../screens/AIChatScreen';
import BottomTabs from './BottomTabs';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  HomeTabs: undefined;
  AllHealthData: undefined;
  WaterIntake: undefined;
  Sleep: undefined;
  PeriodCycle: undefined;
  AIChat: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F7F7FA' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="HomeTabs" component={BottomTabs} />
        <Stack.Screen name="AllHealthData" component={AllHealthDataScreen} />
        <Stack.Screen name="WaterIntake" component={WaterIntakeScreen} />
        <Stack.Screen name="Sleep" component={SleepScreen} />
        <Stack.Screen name="PeriodCycle" component={PeriodCycleScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

