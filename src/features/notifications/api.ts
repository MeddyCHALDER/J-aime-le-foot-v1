import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

/**
 * Notifications push Web (PWA). L'envoi est fait par l'Edge Function send-push ;
 * ici : abonnement de l'appareil, annonces déclenchées par l'admin, liens d'ouverture.
 */

export type PushState =
  /** Navigateur sans Web Push. */
  | 'unsupported'
  /** iPhone / iPad : Web Push n'existe que dans l'app ajoutée à l'écran d'accueil. */
  | 'needs-install'
  /** L'utilisateur a refusé : seul le navigateur peut le réautoriser. */
  | 'denied'
  | 'off'
  | 'on';

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hasPushApi() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Le service worker n'est enregistré qu'après le chargement de la page : on l'attend un peu. */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!hasPushApi()) return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export async function getPushState(): Promise<PushState> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'unsupported';
  if (!hasPushApi()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

let publicKeyCache: string | null = null;

async function fetchPublicKey(): Promise<string> {
  if (publicKeyCache) return publicKeyCache;
  const { data, error } = await supabase.functions.invoke('send-push', { body: { kind: 'config' } });
  if (error) throw new Error(error.message || 'Notifications indisponibles');
  if (data?.error) throw new Error(String(data.error));
  publicKeyCache = String(data.publicKey);
  return publicKeyCache;
}

function base64UrlToBytes(b64: string): Uint8Array {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/** À appeler depuis un geste de l'utilisateur : Safari refuse la demande sinon. */
export async function enablePush(): Promise<PushState> {
  if (!hasPushApi()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await getRegistration();
  if (!reg) throw new Error('Service worker indisponible : recharge l’app et réessaie.');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(await fetchPublicKey()),
    });
  }
  await saveSubscription(sub);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return getPushState();
}

/**
 * Rattache l'abonnement de cet appareil au compte connecté (changement de compte,
 * clés renouvelées par le navigateur). Silencieux : rien à faire si non autorisé.
 */
export async function syncPushSubscription() {
  try {
    if (!hasPushApi() || Notification.permission !== 'granted') return;
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await saveSubscription(sub);
  } catch (e) {
    console.warn('[push] synchronisation impossible', e);
  }
}

/** Déconnexion : l'appareil ne reçoit plus les annonces du compte quitté. */
export async function forgetThisDevice() {
  try {
    if (!hasPushApi()) return;
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
  } catch (e) {
    console.warn('[push] désabonnement impossible', e);
  }
}

/**
 * Annonces de l'admin. Best-effort : un échec d'envoi ne doit jamais faire échouer
 * la création du match ou du trophée, déjà enregistrée.
 */
async function announce(body: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', { body });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
  } catch (e) {
    console.warn('[push] annonce non envoyée', e);
  }
}

/** Notification de test sur ses propres appareils. Contrairement aux annonces, l'erreur remonte. */
export async function sendTestPush(): Promise<{ sent: number; devices: number }> {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { kind: 'test' } });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return { sent: Number(data?.sent ?? 0), devices: Number(data?.devices ?? 0) };
}

export function announceMatchOpen(matchId: string) {
  return announce({ kind: 'match_open', matchId });
}

export function announceVotesOpen(awardIds: string[]) {
  if (awardIds.length === 0) return Promise.resolve();
  return announce({ kind: 'vote_open', awardIds });
}

/** Écran à ouvrir depuis une notification (paramètres ?open=… posés par send-push). */
export type OpenTarget =
  | { screen: 'match'; matchId: string }
  | { screen: 'award'; awardId: string; leagueId: string }
  | { screen: 'votes' };

export function parseOpenTarget(href: string): OpenTarget | null {
  let params: URLSearchParams;
  try {
    params = new URL(href).searchParams;
  } catch {
    return null;
  }
  const open = params.get('open');
  const id = params.get('id');
  if (open === 'match' && id) return { screen: 'match', matchId: id };
  if (open === 'award' && id && params.get('league')) {
    return { screen: 'award', awardId: id, leagueId: params.get('league')! };
  }
  if (open === 'votes') return { screen: 'votes' };
  return null;
}
