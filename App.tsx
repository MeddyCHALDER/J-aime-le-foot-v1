import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/lib/queryClient';
import { registerPwa } from './src/lib/registerPwa';
import { initInstallPrompt } from './src/lib/install';
import { installPressFeedback } from './src/lib/pressFeedback';
import { capturePendingJoin } from './src/features/leagues/invite';
import { loadBrandFonts } from './src/lib/brandFonts';
import './src/lib/motion';
import { AppThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import { AppShell } from './src/components/AppShell';
import { RootNavigator } from './src/navigation/RootNavigator';

registerPwa();
initInstallPrompt();
loadBrandFonts();
installPressFeedback();
// Lien d'invitation ?join=CODE : gardé même si le joueur doit d'abord se connecter
capturePendingJoin();

function NavigationRoot() {
  const { scheme, tokens } = useAppTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: tokens.lime,
      background: tokens.ink,
      card: tokens.ink,
      text: tokens.text,
      border: tokens.line,
      notification: tokens.lime,
    },
  };

  return (
    <AppShell>
      <NavigationContainer theme={navigationTheme} style={{ flex: 1 }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </AppShell>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <NavigationRoot />
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
