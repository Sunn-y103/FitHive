import 'react-native-url-polyfill/auto';
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { AppStateProvider } from './contexts/AppStateContext';

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <AppNavigator />
      </AppStateProvider>
    </AuthProvider>
  );
}

