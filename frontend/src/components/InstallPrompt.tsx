'use client'

// Invite à ajouter l'app à l'écran d'accueil.
// Android / Chrome exposent `beforeinstallprompt` et installent en un geste ;
// iOS n'a aucune API équivalente, on y explique le geste à faire à la main.

import { useCallback, useEffect, useState } from 'react'

const DISMISSED_KEY = 'jlf-install-dismissed'

// Pas encore dans la lib standard de TypeScript.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS n'implémente pas display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

function dismissedBefore() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    // Navigation privée : on affichera l'invite, c'est sans conséquence.
    return false
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone() || dismissedBefore()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setIosHint(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // iOS n'a aucune API d'installation : on décide d'afficher l'indice une fois
    // le premier rendu passé. Le faire dans le corps de l'effet provoquerait un
    // rendu en cascade, et le faire à l'initialisation du state ferait diverger
    // le rendu serveur (toujours masqué) du rendu client.
    const hint = window.setTimeout(() => setIosHint(isIos()), 0)

    return () => {
      window.clearTimeout(hint)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Tant pis : l'invite reviendra à la prochaine visite.
    }
    setDeferred(null)
    setIosHint(false)
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    // L'événement ne se rejoue pas.
    setDeferred(null)
  }, [deferred])

  if (!deferred && !iosHint) return null

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      className="absolute left-3 right-3 z-50 flex animate-rise items-center gap-3 rounded-[14px] border border-line bg-surface2 px-4 py-3.5 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="t-item-sm">Ajoute J&apos;aime le Foot à ton écran d&apos;accueil</span>
        <span className="t-sub-xs">
          {iosHint ? 'Partager, puis « Sur l’écran d’accueil ».' : 'Plein écran, comme une vraie app.'}
        </span>
      </div>

      {deferred && (
        <button
          type="button"
          onClick={install}
          className="flex h-10 flex-none items-center rounded-full bg-lime px-4 text-[13.5px] font-bold text-ink"
        >
          Installer
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Ne plus afficher"
        className="flex-none p-1"
        style={{ color: 'var(--txt2)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
