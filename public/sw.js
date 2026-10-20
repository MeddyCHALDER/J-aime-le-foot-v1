/* Service worker J'aime le foot — version stampée à chaque build.
 * Placeholder remplacé par scripts/stamp-sw.js (commit SHA ou timestamp). */
const BUILD_ID = '__JLF_BUILD_ID__';
const CACHE = `jlf-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  // Active la nouvelle version sans attendre la fermeture des onglets.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add('/').catch(() => undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Vide TOUS les anciens caches (toutes versions) pour forcer la MAJ.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'JLF_SW_ACTIVATED', buildId: BUILD_ID });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notifications push (Edge Function send-push) : { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "J'aime le foot", {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  );
});

// Toucher la notification : on réutilise l'app déjà ouverte plutôt que d'en ouvrir une
// seconde (la session et le cache de requêtes y sont déjà chargés).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        client.postMessage({ type: 'JLF_OPEN', url });
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

function isHashedAsset(url) {
  return (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/') ||
    /\.[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigation : toujours le réseau (pas de shell périmée).
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Assets hashés : cache-first OK (URL immuable).
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Reste : réseau d'abord, pas de mise en cache agressive.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
