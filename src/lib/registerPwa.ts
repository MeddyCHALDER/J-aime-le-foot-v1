import { Platform } from 'react-native';

/**
 * Enregistre le SW et force la prise en compte des nouvelles versions :
 * skipWaiting + reload de tous les onglets dès qu'un nouveau SW s'active.
 */
export function registerPwa() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const reloadOnce = () => {
    const key = 'jlf-sw-reloaded';
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    reloadOnce();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'JLF_SW_ACTIVATED') {
      reloadOnce();
    }
  });

  window.addEventListener('load', async () => {
    try {
      // bust le cache HTTP de sw.js lui-même
      let v = String(Date.now());
      try {
        const meta = await fetch(`/build-id.json?t=${Date.now()}`, { cache: 'no-store' }).then(
          (r) => (r.ok ? r.json() : null)
        );
        if (meta?.buildId) v = String(meta.buildId);
      } catch {
        /* ignore */
      }

      const reg = await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(v)}`, {
        updateViaCache: 'none',
      });

      const askSkip = (worker: ServiceWorker | null) => {
        worker?.postMessage({ type: 'SKIP_WAITING' });
      };

      if (reg.waiting) askSkip(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            askSkip(installing);
          }
        });
      });

      // Reping périodique + au retour d'onglet
      const check = () => reg.update().catch(() => undefined);
      setInterval(check, 60_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    } catch (err) {
      console.warn('[PWA] Service worker non enregistré:', err);
    }
  });
}
