import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { MD3Type } from 'react-native-paper/lib/typescript/types';
import { brand, brandLight, fonts, type BrandTokens } from './brand';

const display = { fontFamily: fonts.display ?? 'System', fontWeight: '700', fontStyle: 'italic' } as Partial<MD3Type>;
const body: Partial<MD3Type> = { fontFamily: fonts.body ?? 'System' };

const fontConfig = configureFonts({
  config: {
    displayLarge: display,
    displayMedium: display,
    displaySmall: display,
    headlineLarge: display,
    headlineMedium: display,
    headlineSmall: display,
    titleLarge: { ...body, fontWeight: '600' },
    titleMedium: { ...body, fontWeight: '600' },
    titleSmall: { ...body, fontWeight: '600' },
    labelLarge: { ...body, fontWeight: '600' },
    labelMedium: { ...body, fontWeight: '500' },
    labelSmall: { ...body, fontWeight: '500' },
    bodyLarge: body,
    bodyMedium: body,
    bodySmall: body,
  },
});

function buildTheme(tokens: BrandTokens, base: MD3Theme, dark: boolean): MD3Theme {
  return {
    ...base,
    dark,
    roundness: 1,
    colors: {
      ...base.colors,
      primary: tokens.lime,
      onPrimary: tokens.onLime,
      primaryContainer: tokens.infoBg,
      onPrimaryContainer: tokens.infoText,
      secondary: tokens.lime,
      onSecondary: tokens.onLime,
      secondaryContainer: tokens.infoBg,
      onSecondaryContainer: tokens.lime,
      tertiary: tokens.lime,
      onTertiary: tokens.onLime,
      tertiaryContainer: tokens.infoBg,
      onTertiaryContainer: tokens.infoText,
      background: tokens.ink,
      onBackground: tokens.text,
      surface: tokens.surface,
      onSurface: tokens.text,
      surfaceVariant: tokens.surface2,
      onSurfaceVariant: tokens.muted,
      surfaceDisabled: dark ? 'rgba(242,244,238,0.12)' : 'rgba(27,29,25,0.12)',
      onSurfaceDisabled: tokens.muted2,
      inverseSurface: tokens.text,
      inverseOnSurface: tokens.ink,
      inversePrimary: tokens.onLime,
      outline: tokens.line,
      outlineVariant: tokens.line,
      error: tokens.errorText,
      onError: tokens.onLime,
      errorContainer: tokens.errorBg,
      onErrorContainer: tokens.errorText,
      backdrop: dark ? 'rgba(14,16,13,0.7)' : 'rgba(0,0,0,0.4)',
      elevation: {
        level0: 'transparent',
        level1: tokens.surface,
        level2: tokens.surface2,
        level3: tokens.surface2,
        level4: tokens.surface2,
        level5: tokens.surface2,
      },
    },
    fonts: { ...fontConfig, default: { ...fontConfig.default, fontFamily: body.fontFamily ?? 'System' } },
  };
}

export const darkTheme = buildTheme(brand, MD3DarkTheme, true);
export const lightTheme = buildTheme(brandLight, MD3LightTheme, false);

/** Défaut : sombre (charte V1). */
export const appTheme = darkTheme;
