'use client'

// Bascule sombre / clair. Le prototype propose les deux thèmes ; le bouton
// vit sur le Profil. Le choix est écrit sur <html data-theme> pour que les
// jetons CSS de globals.css basculent d'un coup.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'
const THEME_KEY = 'jlf_theme'

interface ThemeValue {
  theme: Theme
  toggle: () => void
  /** « Thème clair » quand on est en sombre — le libellé de l'action à venir. */
  label: string
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      /* stockage indisponible : on reste sur le sombre par défaut */
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        /* non persisté, mais la bascule fonctionne pour la session */
      }
      return next
    })
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ theme, toggle, label: theme === 'dark' ? 'Thème clair' : 'Thème sombre' }),
    [theme, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return ctx
}
