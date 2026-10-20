import { Platform } from 'react-native';

/** Événement Chrome / Android « installer l'app » (non typé dans lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type DevicePlatform = 'ios' | 'android' | 'other';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/**
 * À appeler au démarrage : Chrome n'émet beforeinstallprompt qu'une fois, souvent avant
 * que l'écran du tuto soit monté. On le garde pour proposer « Installer » en un geste.
 */
export function initInstallPrompt() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export function onInstallPromptChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ouvre la fenêtre d'installation native (Android / Chrome). */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const evt = deferredPrompt;
  deferredPrompt = null;
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  listeners.forEach((l) => l());
  return outcome === 'accepted';
}

/** L'app tourne déjà depuis l'écran d'accueil. */
export function isStandalone() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function devicePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** Sur iPhone, seul Safari ajoute vraiment à l'écran d'accueil sur les vieux iOS. */
export function isIosNonSafari() {
  if (typeof navigator === 'undefined') return false;
  return devicePlatform() === 'ios' && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

const SEEN_KEY = 'jlf-install-guide-seen';

/** Le tuto a déjà été vu (ou fermé) pour ce compte sur cet appareil. */
export function installGuideSeen(userId: string) {
  try {
    return window.localStorage.getItem(`${SEEN_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markInstallGuideSeen(userId: string) {
  try {
    window.localStorage.setItem(`${SEEN_KEY}:${userId}`, '1');
  } catch {
    /* stockage indisponible (navigation privée) : le tuto se remontrera, sans gravité */
  }
}
