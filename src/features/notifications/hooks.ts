import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { parseOpenTarget, syncPushSubscription, type OpenTarget } from './api';

/**
 * Ouvre l'écran visé par une notification touchée :
 *  - app fermée → le service worker l'a lancée sur /?open=… ;
 *  - app déjà ouverte → le service worker envoie un message JLF_OPEN.
 * À monter une fois connecté, là où la navigation est disponible.
 */
export function useNotificationOpener(onOpen: (target: OpenTarget) => void) {
  const handler = useRef(onOpen);
  handler.current = onOpen;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    void syncPushSubscription();

    const initial = parseOpenTarget(window.location.href);
    if (initial) {
      // Retire ?open=… : un rechargement ne doit pas rouvrir l'écran.
      window.history.replaceState(null, '', window.location.pathname);
      handler.current(initial);
    }

    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'JLF_OPEN') return;
      const target = parseOpenTarget(String(event.data.url ?? ''));
      if (target) handler.current(target);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
}
