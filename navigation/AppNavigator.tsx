import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AllHealthDataScreen from '../screens/AllHealthDataScreen';
import WaterIntakeScreen from '../screens/WaterIntakeScreen';
import SleepScreen from '../screens/SleepScreen';
import PeriodCycleScreen from '../screens/PeriodCycleScreen';
import AIChatScreen from '../screens/AIChatScreen';
import WorkoutCameraScreen from '../screens/WorkoutCameraScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import ChallengeDetailsScreen from '../screens/ChallengeDetailsScreen';
import BMIScreen from '../screens/BMIScreen';
import NutritionScreen from '../screens/NutritionScreen';
import BurnedCaloriesScreen from '../screens/BurnedCaloriesScreen';
import DoctorDetailsScreen, { Doctor } from '../screens/DoctorDetailsScreen';
import CoachProfileScreen from '../screens/CoachProfileScreen';
import BookSessionScreen from '../screens/BookSessionScreen';
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen';
import CoachChatScreen from '../screens/CoachChatScreen';
import { Coach } from '../screens/CoachScreen';
import BottomTabs from './BottomTabs';
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  HomeTabs: { screen?: 'Home' | 'Rewards' | 'Community' | 'Coach' | 'User' } | undefined;
  AllHealthData: undefined;
  WaterIntake: undefined;
  Sleep: undefined;
  PeriodCycle: undefined;
  AIChat: undefined;
  CreateChallenge: undefined;
  ChallengeDetails: { challengeId: string };
  WorkoutCamera: { exerciseType: 'pushup' | 'curl' | 'squat' };
  BMI: undefined;
  Nutrition: undefined;
  BurnedCalories: undefined;
  DoctorDetails: { doctor: Doctor };
  CoachProfile: { coach: Coach };
  BookSession: { coach: Coach };
  BookingConfirmation: { coach: Coach; date: string; time: string };
  CoachChat: { coach: Coach };
};
const Stack = createStackNavigator<RootStackParamList>();
const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#F7F7FA' } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="HomeTabs" component={BottomTabs} />
        <Stack.Screen name="AllHealthData" component={AllHealthDataScreen} />
        <Stack.Screen name="WaterIntake" component={WaterIntakeScreen} />
        <Stack.Screen name="Sleep" component={SleepScreen} />
        <Stack.Screen name="PeriodCycle" component={PeriodCycleScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="WorkoutCamera" component={WorkoutCameraScreen} />
        <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
        <Stack.Screen name="ChallengeDetails" component={ChallengeDetailsScreen} />
        <Stack.Screen name="BMI" component={BMIScreen} />
        <Stack.Screen name="Nutrition" component={NutritionScreen} />
        <Stack.Screen name="BurnedCalories" component={BurnedCaloriesScreen} />
        <Stack.Screen name="DoctorDetails" component={DoctorDetailsScreen} />
        <Stack.Screen name="CoachProfile" component={CoachProfileScreen} />
        <Stack.Screen name="BookSession" component={BookSessionScreen} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="CoachChat" component={CoachChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

