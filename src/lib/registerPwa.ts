import { Platform } from 'react-native';

/** Enregistre le service worker (navigateur uniquement) pour l'installabilité PWA. */
export function registerPwa() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service worker non enregistré:', err);
    });
  });
}
