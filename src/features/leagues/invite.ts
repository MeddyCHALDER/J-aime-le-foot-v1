import { Platform, Share } from 'react-native';

const APP_URL = 'https://www.jaimelefoot.app';
const PENDING_KEY = 'jlf-pending-join';

/** Lien qui fait rejoindre la ligue en un clic : https://…/?join=CODE */
export function inviteLink(code: string) {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : APP_URL;
  return `${origin}/?join=${encodeURIComponent(code.toUpperCase())}`;
}

/** Message prêt à coller sur WhatsApp, Instagram, SMS… */
export function inviteMessage(leagueName: string, code: string) {
  return [
    `⚽ Rejoins ma ligue « ${leagueName} » sur J'aime le foot !`,
    `Inscris-toi aux matchs, fais monter ta carte et vote pour les trophées de la saison.`,
    ``,
    `👉 ${inviteLink(code)}`,
    ``,
    `Code d'invitation : ${code.toUpperCase()}`,
  ].join('\n');
}

/** Copie le message ; false si le navigateur refuse (on affiche alors le texte à copier). */
export async function copyInvite(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* presse-papiers refusé */
  }
  return false;
}

/** Menu de partage du téléphone (WhatsApp, Instagram, SMS…). false si indisponible. */
export async function shareInvite(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (!navigator.share) return false;
      await navigator.share({ text });
      return true;
    }
    await Share.share({ message: text });
    return true;
  } catch (e) {
    // Partage annulé : ce n'est pas une erreur
    return e instanceof DOMException && e.name === 'AbortError';
  }
}

export function canShareInvite() {
  return Platform.OS !== 'web' || (typeof navigator !== 'undefined' && !!navigator.share);
}

/**
 * À appeler au démarrage, avant la connexion : garde le code d'un lien ?join=CODE
 * (même si le joueur doit d'abord se connecter ou créer son compte) et nettoie l'URL.
 */
export function capturePendingJoin() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('join');
  if (!code) return;
  try {
    window.localStorage.setItem(PENDING_KEY, code.trim().toUpperCase().slice(0, 12));
  } catch {
    /* stockage indisponible : le joueur pourra saisir le code à la main */
  }
  url.searchParams.delete('join');
  window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
}

export function takePendingJoin(): string | null {
  try {
    const code = window.localStorage.getItem(PENDING_KEY);
    if (code) window.localStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}
