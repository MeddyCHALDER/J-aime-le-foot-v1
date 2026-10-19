import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = configureFonts({ config: { fontFamily: 'System' } });

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#C9FF00',
    secondary: '#C9FF00',
    tertiary: '#C9FF00',
    surface: '#f8f9fa',
    background: '#ffffff',
  },
  fonts: fontConfig,
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#C9FF00',
    secondary: '#C9FF00',
    tertiary: '#C9FF00',
    surface: '#1a1a1a',
    background: '#0d0d0d',
  },
  fonts: fontConfig,
};
