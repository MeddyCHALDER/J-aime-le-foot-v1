import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet, View } from 'react-native';
import { queryClient } from './src/lib/queryClient';
import { registerPwa } from './src/lib/registerPwa';
import { loadBrandFonts } from './src/lib/brandFonts';
import './src/lib/motion';
import { appTheme } from './src/theme/paperTheme';
import { brand } from './src/theme/brand';
import { RootNavigator } from './src/navigation/RootNavigator';

registerPwa();
loadBrandFonts();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.lime,
    background: brand.ink,
    card: brand.ink,
    text: brand.text,
    border: brand.line,
    notification: brand.lime,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={appTheme}>
          <View style={[styles.root, { backgroundColor: brand.ink }]}>
            <View style={styles.shell}>
              <NavigationContainer theme={navigationTheme}>
                <StatusBar style="light" />
                <RootNavigator />
              </NavigationContainer>
            </View>
          </View>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: Platform.OS === 'web' ? '100%' : undefined,
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
  },
});
