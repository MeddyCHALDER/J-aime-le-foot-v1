'use client'

// Session côté client : jeton JWT, utilisateur, profil joueur et carte.
// Le backend délivre un JWT de 7 jours ; on le garde en localStorage et on
// recharge profil + carte à chaque montage pour que la carte affichée soit
// toujours celle que l'admin vient de mettre à jour.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { PlayerCard, PlayerProfile, UserRole, UserSummary } from './types'

const TOKEN_KEY = 'jlf_token'
const USER_KEY = 'jlf_user'

type SessionUser = UserSummary & { role: UserRole }

interface SessionValue {
  token: string | null
  user: SessionUser | null
  profile: PlayerProfile | null
  card: PlayerCard | null
  /** Chargement initial : évite de flasher l'onboarding sur un utilisateur connecté. */
  loading: boolean
  isAdmin: boolean
  /** Renvoie le jeton pour que l'appelant enchaîne sans attendre un re-rendu. */
  login: (email: string, password: string) => Promise<{ token: string; role: UserRole }>
  register: (email: string, password: string, username?: string) => Promise<string>
  logout: () => void
  /** Recharge profil et carte depuis l'API. */
  refresh: () => Promise<void>
  setProfile: (p: PlayerProfile | null) => void
  setCard: (c: PlayerCard | null) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [card, setCard] = useState<PlayerCard | null>(null)
  const [loading, setLoading] = useState(true)

  // Restauration depuis le stockage local, puis le rôle courant côté serveur.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      let storedToken: string | null = null
      let storedUser: SessionUser | null = null
      try {
        storedToken = localStorage.getItem(TOKEN_KEY)
        const raw = localStorage.getItem(USER_KEY)
        if (raw) storedUser = JSON.parse(raw) as SessionUser
      } catch {
        // Navigation privée ou stockage bloqué : on repart d'une session vide.
      }

      if (cancelled) return
      if (storedToken) setToken(storedToken)
      if (storedUser) setUser(storedUser)

      if (storedToken) {
        try {
          const me = await api.users.me(storedToken)
          if (cancelled) return
          const next: SessionUser = {
            id: me.id,
            email: me.email,
            username: me.username,
            role: me.role ?? 'PLAYER',
          }
          setUser(next)
          try {
            localStorage.setItem(USER_KEY, JSON.stringify(next))
          } catch {
            /* session valable le temps de l'onglet */
          }
        } catch {
          // Jeton périmé ou API injoignable : on garde ce qui est en local.
        }
      }

      if (!cancelled) setLoading(false)
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const loadPlayer = useCallback(async (t: string) => {
    try {
      const [p, c] = await Promise.all([api.players.me(t), api.players.myCard(t)])
      setProfile(p)
      setCard(c)
    } catch {
      // Backend injoignable : on garde la session, les écrans afficheront leur état vide.
      setProfile(null)
      setCard(null)
    }
  }, [])

  useEffect(() => {
    if (token) void loadPlayer(token)
  }, [token, loadPlayer])

  const persist = useCallback((t: string, u: SessionUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, t)
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    } catch {
      // Sans stockage la session reste valable le temps de l'onglet.
    }
    setToken(t)
    setUser(u)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login({ email, password })
      persist(res.token, res.user)
      return { token: res.token, role: res.user.role }
    },
    [persist]
  )

  const register = useCallback(
    async (email: string, password: string, username?: string) => {
      const res = await api.auth.register({ email, password, username })
      persist(res.token, res.user)
      return res.token
    },
    [persist]
  )

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {
      /* rien à nettoyer */
    }
    setToken(null)
    setUser(null)
    setProfile(null)
    setCard(null)
  }, [])

  const refresh = useCallback(async () => {
    if (token) await loadPlayer(token)
  }, [token, loadPlayer])

  const value = useMemo<SessionValue>(
    () => ({
      token,
      user,
      profile,
      card,
      loading,
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      refresh,
      setProfile,
      setCard,
    }),
    [token, user, profile, card, loading, login, register, logout, refresh]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession doit être utilisé dans <SessionProvider>')
  return ctx
}
