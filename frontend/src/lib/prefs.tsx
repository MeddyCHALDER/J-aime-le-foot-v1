'use client'

// Les variantes que le prototype exposait dans son panneau Tweaks deviennent
// ici de vraies préférences, réglables depuis le Profil : présentation du feed
// et du classement.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type FeedStyle = 'reels' | 'cards'
export type RankStyle = 'podium' | 'table'

const KEY = 'jlf_prefs'

interface PrefsValue {
  feedStyle: FeedStyle
  rankStyle: RankStyle
  setFeedStyle: (s: FeedStyle) => void
  setRankStyle: (s: RankStyle) => void
}

const PrefsContext = createContext<PrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [feedStyle, setFeed] = useState<FeedStyle>('reels')
  const [rankStyle, setRank] = useState<RankStyle>('podium')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<PrefsValue>
      if (parsed.feedStyle === 'reels' || parsed.feedStyle === 'cards') setFeed(parsed.feedStyle)
      if (parsed.rankStyle === 'podium' || parsed.rankStyle === 'table') setRank(parsed.rankStyle)
    } catch {
      /* pas de préférences stockées : on garde les valeurs du design */
    }
  }, [])

  const persist = useCallback((next: { feedStyle: FeedStyle; rankStyle: RankStyle }) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* non persisté, mais actif pour la session */
    }
  }, [])

  const setFeedStyle = useCallback(
    (s: FeedStyle) => {
      setFeed(s)
      persist({ feedStyle: s, rankStyle })
    },
    [persist, rankStyle]
  )

  const setRankStyle = useCallback(
    (s: RankStyle) => {
      setRank(s)
      persist({ feedStyle, rankStyle: s })
    },
    [persist, feedStyle]
  )

  const value = useMemo<PrefsValue>(
    () => ({ feedStyle, rankStyle, setFeedStyle, setRankStyle }),
    [feedStyle, rankStyle, setFeedStyle, setRankStyle]
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs doit être utilisé dans <PrefsProvider>')
  return ctx
}
