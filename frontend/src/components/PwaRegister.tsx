'use client'

// Enregistre le service worker. Rien en développement : il mettrait en cache
// les fichiers de Next et casserait le rechargement à chaud.

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    // Un seul rechargement quand la nouvelle version prend la main, sinon
    // `controllerchange` peut boucler.
    let reloading = false
    const onControllerChange = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING')

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch((err) => console.error('Service worker non enregistré', err))

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
