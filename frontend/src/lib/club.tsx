'use client'

// L'app est centrée sur un club (FC MONDAY dans le prototype). Le club courant
// est la première équipe du joueur connecté ; à défaut, la première équipe
// existante, pour que les écrans restent lisibles avant tout rattachement.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { useSession } from './session'
import type { Team, Tournament } from './types'

interface ClubValue {
  team: Team | null
  /** Championnat en cours du club — alimente le classement. */
  championship: Tournament | null
  loading: boolean
  reload: () => void
}

const ClubContext = createContext<ClubValue | null>(null)

export function ClubProvider({ children }: { children: ReactNode }) {
  const { token } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [championship, setChampionship] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        let resolved: Team | null = null

        if (token) {
          const mine = await api.teams.mine(token)
          if (mine.length > 0) resolved = mine[0]
        }
        if (!resolved) {
          const all = await api.teams.list()
          resolved = all[0] ?? null
        }

        // La liste ne porte pas les cartes des membres : on recharge le détail.
        if (resolved) {
          try {
            resolved = await api.teams.byId(resolved.id)
          } catch {
            /* on garde la version allégée */
          }
        }

        const champs = await api.championships.list().catch(() => [])

        if (!cancelled) {
          setTeam(resolved)
          setChampionship(champs[0] ?? null)
        }
      } catch {
        if (!cancelled) {
          setTeam(null)
          setChampionship(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token, nonce])

  const value = useMemo<ClubValue>(
    () => ({ team, championship, loading, reload: () => setNonce((n) => n + 1) }),
    [team, championship, loading]
  )

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
}

export function useClub() {
  const ctx = useContext(ClubContext)
  if (!ctx) throw new Error('useClub doit être utilisé dans <ClubProvider>')
  return ctx
}
