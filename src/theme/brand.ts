import { Easing, Platform } from 'react-native';

/**
 * Jetons alignés sur frontend/src/app/globals.css (thème sombre par défaut).
 * Lime #C6FF00 — pas #C9FF00 (ancien FootWorld).
 */
export const brand = {
  lime: '#C6FF00',
  ink: '#0E100D',
  shellBg: '#0A0B09',
  surface: '#181B16',
  surface2: '#22261F',
  field: '#181B16',
  fieldFocus: '#22261F',
  line: 'rgba(255,255,255,0.10)',
  pitchLine: 'rgba(255,255,255,0.10)',
  pitchLineSoft: 'rgba(255,255,255,0.06)',
  text: '#F2F4EE',
  muted: 'rgba(242,244,238,0.55)',
  muted2: 'rgba(242,244,238,0.42)',
  placeholder: 'rgba(242,244,238,0.42)',
  track: 'rgba(255,255,255,0.09)',
  tabbar: 'rgba(14,16,13,0.92)',
  errorBg: '#2A1414',
  errorText: '#FFB4A8',
  infoBg: '#1B2410',
  infoText: '#DDF79A',
  /** Encre sur lime / or */
  onLime: '#12140F',
} as const;

export const brandLight = {
  lime: '#C6FF00',
  ink: '#F4F5EF',
  shellBg: '#0A0B09',
  surface: '#FFFFFF',
  surface2: '#EBEDE4',
  field: '#FFFFFF',
  fieldFocus: '#EBEDE4',
  line: 'rgba(0,0,0,0.10)',
  pitchLine: 'rgba(0,0,0,0.10)',
  pitchLineSoft: 'rgba(0,0,0,0.06)',
  text: '#1B1D19',
  muted: 'rgba(27,29,25,0.55)',
  muted2: 'rgba(27,29,25,0.42)',
  placeholder: 'rgba(27,29,25,0.42)',
  track: 'rgba(27,29,25,0.12)',
  tabbar: 'rgba(255,255,255,0.92)',
  errorBg: '#FCE8E6',
  errorText: '#B3261E',
  infoBg: '#E8F5C8',
  infoText: '#3A4A10',
  onLime: '#12140F',
} as const;

export type BrandTokens = {
  lime: string;
  ink: string;
  shellBg: string;
  surface: string;
  surface2: string;
  field: string;
  fieldFocus: string;
  line: string;
  pitchLine: string;
  pitchLineSoft: string;
  text: string;
  muted: string;
  muted2: string;
  placeholder: string;
  track: string;
  tabbar: string;
  errorBg: string;
  errorText: string;
  infoBg: string;
  infoText: string;
  onLime: string;
};

/**
 * Polices : Chakra Petch (titres, italique) et Barlow (texte).
 * Chargées depuis Google Fonts sur le web (voir src/lib/brandFonts.ts).
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
