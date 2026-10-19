import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = configureFonts({ config: { fontFamily: 'System' } });

const roundness = 12;

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#C9FF00',
    secondary: '#C9FF00',
    tertiary: '#C9FF00',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onTertiary: '#000000',
    onSurface: '#000000',
    onSurfaceVariant: '#000000',
    onBackground: '#000000',
    outline: '#000000',
    outlineVariant: '#1a1a1a',
    surface: '#f8faf9',
    background: '#ffffff',
  },
  fonts: fontConfig,
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#C9FF00',
    secondary: '#C9FF00',
    tertiary: '#C9FF00',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onTertiary: '#000000',
    surface: '#1a1d1c',
    background: '#0d1110',
  },
  fonts: fontConfig,
};
