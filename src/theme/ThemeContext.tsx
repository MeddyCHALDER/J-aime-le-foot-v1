import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { Platform } from 'react-native';
import { brand, brandLight, type BrandTokens } from './brand';
import { darkTheme, lightTheme } from './paperTheme';

export type AppColorScheme = 'dark' | 'light';

type ThemeCtx = {
  scheme: AppColorScheme;
  setScheme: (s: AppColorScheme) => void;
  toggleScheme: () => void;
  tokens: BrandTokens;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'jlf-theme';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<AppColorScheme>('dark');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setSchemeState(saved);
  }, []);

  const setScheme = (s: AppColorScheme) => {
    setSchemeState(s);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, s);
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', s);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', scheme);
    }
  }, [scheme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      scheme,
      setScheme,
      toggleScheme: () => setScheme(scheme === 'dark' ? 'light' : 'dark'),
      tokens: scheme === 'dark' ? brand : brandLight,
    }),
    [scheme]
  );

  return (
    <Ctx.Provider value={value}>
      <PaperProvider theme={scheme === 'dark' ? darkTheme : lightTheme}>{children}</PaperProvider>
    </Ctx.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppTheme hors AppThemeProvider');
  return ctx;
}
