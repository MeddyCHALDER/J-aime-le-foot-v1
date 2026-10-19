import { Easing, Platform } from 'react-native';

/** Identité visuelle des écrans d'entrée (splash, connexion, inscription). */
export const brand = {
  lime: '#C9FF00',
  ink: '#0B0F0D',
  field: '#121815',
  fieldFocus: '#18201B',
  line: '#2A332E',
  pitchLine: 'rgba(255,255,255,0.10)',
  pitchLineSoft: 'rgba(255,255,255,0.06)',
  text: '#F3F6F1',
  muted: '#A9B2AC',
  placeholder: '#6F7973',
  errorBg: '#2A1414',
  errorText: '#FFB4A8',
  infoBg: '#1B2410',
  infoText: '#DDF79A',
} as const;

/**
 * Polices : Chakra Petch (titres, italique) et Barlow (texte).
 * Chargées depuis Google Fonts sur le web (voir src/lib/brandFonts.ts),
 * police système en repli ailleurs.
 */
export const fonts = {
  display: Platform.select({
    web: "'Chakra Petch', 'Arial Narrow', sans-serif",
    default: undefined,
  }),
  body: Platform.select({
    web: "Barlow, 'Helvetica Neue', system-ui, sans-serif",
    default: undefined,
  }),
};

export const useNativeDriver = Platform.OS !== 'web';

export const easeOut = Easing.bezier(0.2, 0.9, 0.2, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
