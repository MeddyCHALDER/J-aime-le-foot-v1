import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { MD3Type } from 'react-native-paper/lib/typescript/types';
import { brand, fonts } from './brand';

/**
 * Thème unique de l'app, aligné sur la charte des écrans d'entrée :
 * fond terrain sombre, accent lime, Chakra Petch italique pour les titres, Barlow pour le texte.
 */
// fontStyle n'existe pas dans le type MD3 mais est bien appliqué par Text.
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

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  // Angles quasi vifs comme sur les écrans d'entrée (les boutons MD3 valent 5 × roundness).
  roundness: 1,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.lime,
    onPrimary: brand.ink,
    primaryContainer: brand.infoBg,
    onPrimaryContainer: brand.infoText,
    secondary: brand.lime,
    onSecondary: brand.ink,
    secondaryContainer: brand.infoBg,
    onSecondaryContainer: brand.lime,
    tertiary: brand.lime,
    onTertiary: brand.ink,
    tertiaryContainer: brand.infoBg,
    onTertiaryContainer: brand.infoText,
    background: brand.ink,
    onBackground: brand.text,
    surface: brand.field,
    onSurface: brand.text,
    surfaceVariant: brand.fieldFocus,
    onSurfaceVariant: brand.muted,
    surfaceDisabled: 'rgba(243,246,241,0.12)',
    onSurfaceDisabled: 'rgba(243,246,241,0.38)',
    inverseSurface: brand.text,
    inverseOnSurface: brand.ink,
    inversePrimary: brand.ink,
    outline: brand.line,
    outlineVariant: brand.line,
    error: brand.errorText,
    onError: brand.ink,
    errorContainer: brand.errorBg,
    onErrorContainer: brand.errorText,
    backdrop: 'rgba(11,15,13,0.7)',
    elevation: {
      level0: 'transparent',
      level1: brand.field,
      level2: brand.fieldFocus,
      level3: brand.fieldFocus,
      level4: brand.fieldFocus,
      level5: brand.fieldFocus,
    },
  },
  // `default` sert au <Text> sans variante ; configureFonts ne permet pas de le fixer avec les variantes.
  fonts: { ...fontConfig, default: { ...fontConfig.default, fontFamily: body.fontFamily ?? 'System' } },
};

/** Conservés pour compatibilité : l'app n'a plus qu'un thème sombre. */
export const darkTheme = appTheme;
export const lightTheme = appTheme;
