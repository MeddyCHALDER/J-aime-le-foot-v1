'use client'

// Détail d'un match : inscription, effectif inscrit et feuille de match si
// elle a été validée.

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, ErrorNote, Screen, Skeleton } from '@/components/ui'
import MatchSheetButton from '@/components/MatchSheetButton'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason, fullName, longDate, timeOf } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { ClubMatch } from '@/lib/types'

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { token, profile } = useSession()
  const { team, championship } = useClub()

  const [match, setMatch] = useState<ClubMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setMatch(await api.clubMatches.byId(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match introuvable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const registrations = useMemo(() => match?.registrations ?? [], [match])
  const joined = useMemo(
    () => !!profile && registrations.some((r) => r.playerProfileId === profile.id),
    [registrations, profile]
  )
  const capacity = match?.maxPlayers ?? 16
  const open = match?.status === 'OPEN'

  async function toggleJoin() {
    if (!token || !match) return
    setBusy(true)
    setError(null)
    try {
      if (joined) await api.clubMatches.unregister(match.id, token)
      else await api.clubMatches.register(match.id, token)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={220} className="rounded-[20px]" />
        </div>
      </Screen>
    )
  }

  if (!match) {
    return (
      <Screen>
        <ErrorNote>{error ?? 'Match introuvable.'}</ErrorNote>
        <div className="px-4 pt-4">
          <Link href="/club-matches" className="btn-ghost inline-flex items-center rounded-xl px-4" style={{ height: 44 }}>
            Retour aux matchs
          </Link>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="flex items-center gap-3 px-4 pt-[18px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="h-[34px] w-[34px] flex-none rounded-[10px] border border-line text-[15px] font-semibold text-txt"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <div className="t-num text-[19px] leading-none text-txt">
            {match.tournament?.name ?? 'Match intra-club'}
            {match.round ? ` · J${match.round}` : ''}
          </div>
          <div className="t-sub mt-[6px]">
            {longDate(match.matchDate)} · {timeOf(match.matchDate)}
          </div>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="card-hot mx-4 mt-4 px-[18px] py-4" style={{ borderRadius: 20 }}>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="t-section">Effectif inscrit</span>
          <span className="t-num whitespace-nowrap text-[15px] leading-none text-txt">
            {registrations.length} <span className="opacity-45">/ {capacity}</span>
          </span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-[4px] bg-[var(--track)]">
          <div
            className="h-full rounded-[4px] bg-lime transition-[width] duration-300"
            style={{ width: `${Math.min(100, (registrations.length / capacity) * 100)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {registrations.map((r) => {
            const name = r.playerProfile ? fullName(r.playerProfile) : 'Joueur'
            return (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar name={name} highlight={r.playerProfileId === profile?.id} size={30} />
                <span className="flex-1 text-[13.5px] font-bold text-txt">{name}</span>
                <span className="t-sub-xs">{r.playerProfile?.position ?? '—'}</span>
              </div>
            )
          })}
          {registrations.length === 0 && (
            <p className="text-[12.5px] text-txt2">Personne d&apos;inscrit pour l&apos;instant.</p>
          )}
        </div>

        {open && (
          <button
            type="button"
            onClick={toggleJoin}
            disabled={busy || !token || !profile}
            className="mt-4 w-full rounded-[14px] text-[17px]"
            style={{
              height: 54,
              border: joined ? '1px solid var(--line)' : 'none',
              background: joined ? 'transparent' : 'var(--lime)',
              color: joined ? 'var(--txt)' : '#12140f',
              fontFamily: 'var(--font-chakra), sans-serif',
              fontStyle: 'italic',
              fontWeight: 700,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? '…' : joined ? 'Inscrit — se désinscrire' : "Je m'inscris"}
          </button>
        )}

        <MatchSheetButton
          className="mt-4"
          match={match}
          clubName={match.team?.name ?? team?.name ?? 'Mon club'}
          competition={match.tournament?.name}
          season={championship?.season ?? currentSeason()}
        />
      </div>

      {/* Feuille de match, si elle a été saisie */}
      {(match.stats?.length ?? 0) > 0 && (
        <>
          <div className="t-section mx-4 mt-[22px]">Feuille de match</div>
          <div className="mx-4 mb-6 mt-[11px] overflow-hidden rounded-[16px] border border-line bg-surface">
            {match.stats!.map((s, i) => {
              const name = s.playerProfile ? fullName(s.playerProfile) : 'Joueur'
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-[14px] py-[11px]"
                  style={{
                    borderBottom:
                      i === match.stats!.length - 1 ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <Avatar name={name} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-txt">
                    {name}
                  </span>
                  <span className="t-sub-xs whitespace-nowrap">
                    {s.goals} B · {s.assists} PD
                    {s.yellowCards ? ` · ${s.yellowCards} CJ` : ''}
                    {s.redCards ? ` · ${s.redCards} CR` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Screen>
  )
}
