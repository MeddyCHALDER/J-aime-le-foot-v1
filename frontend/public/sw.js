// Service worker de l'app installée.
// Règle de base : on ne met en cache que la coquille et les fichiers de build.
// Jamais les réponses de l'API, qui sont authentifiées par JWT et finiraient
// sinon lisibles dans le cache du navigateur.

const VERSION = 'v1'
const STATIC_CACHE = `jlf-static-${VERSION}`
const PAGES_CACHE = `jlf-pages-${VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // addAll échoue en bloc si une seule URL part en erreur : on tolère les manquantes.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('jlf-') && k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Permet à la page d'activer tout de suite une version en attente.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

// Les fichiers de build Next sont hashés : une URL donnée ne change jamais
// de contenu, donc cache-first est sûr.
function isImmutable(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

function isStaticFile(url) {
  return /\.(?:css|js|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(url.pathname)
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // L'API tourne sur une autre origine (port 4000 en dev) : on la laisse
  // toujours passer par le réseau, cache compris.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Les payloads RSC ne doivent jamais être servis périmés.
  if (url.searchParams.has('_rsc')) return

  if (isImmutable(url) || isStaticFile(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
  }
})
