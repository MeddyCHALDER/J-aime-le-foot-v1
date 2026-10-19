import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { queryClient } from './src/lib/queryClient';
import { registerPwa } from './src/lib/registerPwa';
import { lightTheme, darkTheme } from './src/theme/paperTheme';
import { RootNavigator } from './src/navigation/RootNavigator';

registerPwa();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
          <View style={styles.shell}>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </View>
        </View>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
  },
});
