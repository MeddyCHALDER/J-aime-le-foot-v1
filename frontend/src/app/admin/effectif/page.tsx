'use client'

// Effectif du club : recherche, filtre par ligne, note globale, bascule du rôle
// Joueur / Admin.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Avatar, EmptyState, ErrorNote, Screen, ScreenHeader, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { LINES, fullName, lineOf } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { UserRole } from '@/lib/types'
import InviteCard from '@/components/InviteCard'

/** « Tous » n'est pas une ligne de jeu, seulement l'absence de filtre. */
type Filter = 'Tous' | (typeof LINES)[number]

const FILTERS: Filter[] = ['Tous', ...LINES]

export default function SquadPage() {
  const { token, user } = useSession()
  const { team, loading, reload } = useClub()

  const [search, setSearch] = useState('')
  const [line, setLine] = useState<Filter>('Tous')
  const [roles, setRoles] = useState<Record<string, UserRole>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const members = useMemo(() => {
    const list = team?.members ?? []
    return list
      .filter((m) => {
        const p = m.playerProfile
        if (!p) return false
        if (line !== 'Tous' && lineOf(p.position) !== line) return false
        if (!search.trim()) return true
        return fullName(p).toLowerCase().includes(search.trim().toLowerCase())
      })
      .sort((a, b) => {
        const ra = a.playerProfile?.cards?.[0]?.overallRating ?? 0
        const rb = b.playerProfile?.cards?.[0]?.overallRating ?? 0
        return rb - ra
      })
  }, [team, line, search])

  async function toggleRole(userId: string, current: UserRole) {
    if (!token) return
    const next: UserRole = current === 'ADMIN' ? 'PLAYER' : 'ADMIN'
    setBusy(userId)
    setError(null)
    try {
      const updated = await api.users.setRole(userId, next, token)
      setRoles((r) => ({ ...r, [userId]: updated.role ?? next }))
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Changement de rôle refusé')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={300} className="rounded-[16px]" />
        </div>
      </Screen>
    )
  }

  const total = team?.members?.length ?? 0

  return (
    <Screen>
      <ScreenHeader
        title="Effectif"
        right={<span className="t-sub">{total} joueurs</span>}
      />

      {team && <InviteCard teamId={team.id} />}

      <input
        className="field-box mx-4 mt-[14px] w-auto"
        style={{ minHeight: 44, height: 44, fontWeight: 400, fontSize: 13.5 }}
        value={search}
        placeholder="Rechercher un joueur…"
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="no-bar mx-4 mt-[11px] flex gap-[7px] overflow-x-auto">
        {FILTERS.map((l) => {
          const on = line === l
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLine(l)}
              className="flex h-8 flex-none items-center rounded-[9px] px-[13px] text-[12px] font-semibold"
              style={{
                background: on ? 'var(--lime)' : 'var(--surface)',
                color: on ? '#12140f' : 'var(--txt2)',
                border: on ? 'none' : '1px solid var(--line)',
              }}
            >
              {l}
            </button>
          )
        })}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {members.length === 0 ? (
        <EmptyState
          title="Aucun joueur"
          hint={
            !team
              ? "Aucune équipe n'existe encore. Crée-la depuis l'onglet Créer."
              : total === 0
                ? "Le club n'a pas encore d'effectif. Invite tes joueurs à créer leur fiche."
                : 'Aucun joueur ne correspond à ce filtre.'
          }
          action={
            !team ? (
              <Link
                href="/admin/creer"
                className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
                style={{ height: 46 }}
              >
                Créer une équipe
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mx-4 mt-3 overflow-hidden rounded-[16px] border border-line bg-surface">
          {members.map((m, i) => {
            const p = m.playerProfile!
            const name = fullName(p)
            const userId = p.user?.id
            const role = (userId && roles[userId]) || p.user?.role || 'PLAYER'
            const isAdminRole = role === 'ADMIN'
            const rating = p.cards?.[0]?.overallRating
            return (
              <div
                key={m.id}
                className="flex items-center gap-[11px] px-[13px] py-[11px]"
                style={{
                  borderBottom: i === members.length - 1 ? 'none' : '1px solid var(--line)',
                }}
              >
                <Avatar name={name} />
                <Link href={`/players/${p.id}`} className="min-w-0 flex-1">
                  <div className="t-item-sm truncate">{name}</div>
                  <div className="t-sub-xs mt-1">{p.position ?? '—'}</div>
                </Link>
                <span className="t-num flex-none text-[17px] leading-none text-txt">
                  {rating ?? '—'}
                </span>
                <button
                  type="button"
                  disabled={!userId || busy === userId || userId === user?.id}
                  onClick={() => userId && toggleRole(userId, role)}
                  className="h-7 flex-none rounded-lg px-[11px] text-[11px] font-bold"
                  style={{
                    background: isAdminRole ? 'rgba(198,255,0,.16)' : 'transparent',
                    color: isAdminRole ? 'var(--lime)' : 'var(--txt2)',
                    border: isAdminRole ? 'none' : '1px solid var(--line)',
                    opacity: busy === userId ? 0.5 : 1,
                  }}
                  title={userId === user?.id ? 'Tu ne peux pas changer ton propre rôle' : undefined}
                >
                  {busy === userId ? '…' : isAdminRole ? 'Admin' : 'Joueur'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="h-6" />
    </Screen>
  )
}
