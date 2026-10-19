'use client'

// Matchs du club : le prochain match ouvert en tête, avec l'inscription et ce
// qu'elle change pour la carte du joueur, puis les rendez-vous suivants.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  EmptyState,
  ErrorNote,
  Pill,
  Screen,
  ScreenHeader,
  Skeleton,
} from '@/components/ui'
import MatchSheetButton from '@/components/MatchSheetButton'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason, dayMonth, fullName, longDate, timeOf } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { ClubMatch, RankingRow } from '@/lib/types'

const DEFAULT_CAPACITY = 16

export default function MatchesPage() {
  const { token, profile } = useSession()
  const { team, championship, loading: clubLoading } = useClub()

  const [matches, setMatches] = useState<ClubMatch[]>([])
  const [featured, setFeatured] = useState<ClubMatch | null>(null)
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadFeatured = useCallback(async (id: string) => {
    const detail = await api.clubMatches.byId(id)
    setFeatured(detail)
  }, [])

  useEffect(() => {
    if (clubLoading) return
    if (!team) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    api.clubMatches
      .byTeam(team.id)
      .then(async (res) => {
        if (cancelled) return
        setMatches(res)
        // Le match mis en avant : le prochain dont les inscriptions sont ouvertes.
        const open = res
          .filter((m) => m.status === 'OPEN')
          .sort((a, b) => +new Date(a.matchDate) - +new Date(b.matchDate))[0]
        if (open) await loadFeatured(open.id)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [team, clubLoading, loadFeatured])

  // Le classement sert à situer le joueur dans la course au Ballon d'Or du club.
  useEffect(() => {
    if (!championship) return
    let cancelled = false
    api.championships
      .ranking(championship.id)
      .then((r) => {
        if (!cancelled) setRanking(r.ranking)
      })
      .catch(() => {
        if (!cancelled) setRanking([])
      })
    return () => {
      cancelled = true
    }
  }, [championship])

  const registrations = useMemo(() => featured?.registrations ?? [], [featured])
  const joined = useMemo(
    () => !!profile && registrations.some((r) => r.playerProfileId === profile.id),
    [registrations, profile]
  )

  // L'API refuse l'inscription d'un joueur hors effectif : on le dit d'emblée
  // plutôt que de laisser le bouton échouer sur un 403.
  const isMember = useMemo(
    () => !!profile && !!team?.members?.some((m) => m.playerProfileId === profile.id),
    [team, profile]
  )
  const capacity = featured?.maxPlayers ?? DEFAULT_CAPACITY
  const count = registrations.length

  const myRank = useMemo(() => {
    if (!profile) return null
    const idx = ranking.findIndex((r) => r.player.id === profile.id)
    return idx === -1 ? null : idx + 1
  }, [ranking, profile])

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.id !== featured?.id && +new Date(m.matchDate) >= Date.now() - 864e5)
        .sort((a, b) => +new Date(a.matchDate) - +new Date(b.matchDate))
        .slice(0, 4),
    [matches, featured]
  )

  async function toggleJoin() {
    if (!token || !featured) return
    setBusy(true)
    setActionError(null)
    try {
      if (joined) await api.clubMatches.unregister(featured.id, token)
      else await api.clubMatches.register(featured.id, token)
      await loadFeatured(featured.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Matchs" right={<Pill tone="ghost">{team?.name ?? 'Mon club'}</Pill>} />

      {error && <ErrorNote>Les matchs n&apos;ont pas pu être chargés : {error}</ErrorNote>}

      {loading && (
        <div className="px-4 pt-[18px]">
          <Skeleton height={380} className="rounded-[20px]" />
        </div>
      )}

      {!loading && !featured && (
        <EmptyState
          title="Aucun match ouvert"
          hint="Dès que l'admin ouvre les inscriptions d'un match, il s'affiche ici."
        />
      )}

      {!loading && featured && (
        <div className="card-hot mx-4 mt-[18px] overflow-hidden" style={{ borderRadius: 20 }}>
          <div className="flex items-center gap-2 px-[18px] pt-4">
            <span className="h-[7px] w-[7px] animate-blip rounded-full bg-lime" />
            <span className="text-[11px] font-semibold uppercase leading-none tracking-[.16em] text-lime">
              Inscriptions ouvertes
            </span>
          </div>

          <div className="t-num px-[18px] pt-3 text-[26px] leading-[1.05] text-txt">
            {featured.tournament?.name ?? 'Match intra-club'}
            <br />
            {team?.name ?? 'Mon club'}
          </div>

          <div className="grid grid-cols-2 gap-[10px] px-[18px] pt-[14px]">
            <InfoBox label="Quand">
              {longDate(featured.matchDate)}
              <br />
              {timeOf(featured.matchDate)}
            </InfoBox>
            <InfoBox label="Où">
              {featured.team?.name ?? team?.name ?? 'Le club'}
              <br />
              <span className="text-txt2">Lieu à confirmer</span>
            </InfoBox>
          </div>

          {/* Effectif */}
          <div className="px-[18px] pt-4">
            <div className="mb-[9px] flex items-baseline justify-between">
              <span className="t-section">Effectif</span>
              <span className="t-num flex-none whitespace-nowrap text-[15px] leading-none text-txt">
                {count} <span className="opacity-45">/ {capacity}</span>
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[4px] bg-[var(--track)]">
              <div
                className="h-full rounded-[4px] bg-lime transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.round((count / capacity) * 100))}%` }}
              />
            </div>
            <div className="mt-3 flex items-center">
              {registrations.slice(0, 7).map((r, i) => {
                const name = r.playerProfile ? fullName(r.playerProfile) : 'Joueur'
                const isMe = !!profile && r.playerProfileId === profile.id
                return (
                  <Avatar
                    key={r.id}
                    name={name}
                    highlight={isMe}
                    style={{
                      marginLeft: i ? -9 : 0,
                      zIndex: 10 - i,
                      border: '2px solid var(--bg)',
                    }}
                  />
                )
              })}
              {count > 7 && (
                <span
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-dashed border-line text-[11px] font-semibold text-txt2"
                  style={{ marginLeft: -9 }}
                >
                  +{count - 7}
                </span>
              )}
              {count === 0 && (
                <span className="t-sub">Personne d&apos;inscrit pour l&apos;instant</span>
              )}
            </div>
          </div>

          <div className="px-[18px] pb-[18px] pt-4">
            <button
              type="button"
              onClick={toggleJoin}
              disabled={busy || !token || !profile || (!isMember && !joined)}
              className="w-full rounded-[14px] text-[17px]"
              style={{
                height: 54,
                border: joined ? '1px solid var(--line)' : 'none',
                background: joined ? 'transparent' : 'var(--lime)',
                color: joined ? 'var(--txt)' : '#12140f',
                fontFamily: 'var(--font-chakra), sans-serif',
                fontStyle: 'italic',
                fontWeight: 700,
                letterSpacing: '.02em',
                boxShadow: joined ? 'none' : '0 10px 26px rgba(198,255,0,.22)',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
                transition: 'all .2s ease',
              }}
            >
              {busy ? '…' : joined ? 'Inscrit — se désinscrire' : "Je m'inscris"}
            </button>
            <p className="mt-[10px] text-center text-[12.5px] leading-[1.4] text-txt2">
              {actionError
                ? actionError
                : !token
                  ? 'Connecte-toi pour t’inscrire au match.'
                  : joined
                    ? "Tu es dans l'effectif. L'admin saisira tes stats après le match."
                    : !isMember
                      ? 'Tu ne fais pas encore partie du club. Demande le lien d’invitation à ton admin.'
                      : `Il reste ${Math.max(0, capacity - count)} places.`}
            </p>

            <MatchSheetButton
              className="mt-4"
              match={featured}
              clubName={team?.name ?? 'Mon club'}
              competition={featured.tournament?.name}
              season={championship?.season ?? currentSeason()}
            />
          </div>
        </div>
      )}

      {/* Ce que ça change */}
      <div className="t-section mx-4 mt-[22px]">Ce que ça change pour toi</div>
      <div className="mx-4 mt-[11px] grid grid-cols-3 gap-[9px]">
        <Impact value="+3" label="points au classement si victoire" />
        <Impact value="6" label="stats mises à jour après le match" />
        <Impact
          value={myRank ? `${myRank}${myRank === 1 ? 'er' : 'e'}` : '—'}
          label={myRank ? 'ta place au Ballon d’Or' : 'classement à venir'}
        />
      </div>

      {/* Prochains rendez-vous */}
      <div className="t-section mx-4 mt-[22px]">Prochains rendez-vous</div>
      <div className="mx-4 mb-6 mt-[11px] flex flex-col gap-[9px]">
        {upcoming.length === 0 && (
          <EmptyState
            title="Rien de programmé"
            hint="Le calendrier du club est vide pour le moment."
          />
        )}
        {upcoming.map((m) => {
          const { day, month } = dayMonth(m.matchDate)
          const open = m.status === 'OPEN'
          return (
            <Link
              key={m.id}
              href={`/club-matches/${m.id}`}
              className="flex items-center gap-[13px] rounded-[14px] border border-line bg-surface px-[14px] py-[13px]"
            >
              <div className="w-[46px] flex-none text-center">
                <div className="t-num text-[20px] leading-none text-txt">{day}</div>
                <div className="mt-[3px] text-[10.5px] font-semibold uppercase leading-none tracking-[.1em] text-txt3">
                  {month}
                </div>
              </div>
              <div className="w-px self-stretch bg-line" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="text-[14.5px] font-bold leading-[1.2] text-txt">
                  {m.tournament?.name ?? 'Intra-club'}
                  {m.round ? ` J${m.round}` : ''}
                </div>
                <div className="t-sub">
                  {team?.name ?? 'Le club'} · {timeOf(m.matchDate)}
                </div>
              </div>
              <span
                className="flex h-[26px] items-center rounded-[7px] px-[10px] text-[11px] font-bold leading-none"
                style={{
                  background: open ? 'rgba(198,255,0,.16)' : 'transparent',
                  color: open ? 'var(--lime)' : 'var(--txt2)',
                  border: open ? 'none' : '1px solid var(--line)',
                }}
              >
                {statusLabel(m.status)}
              </span>
            </Link>
          )
        })}
      </div>
    </Screen>
  )
}

function statusLabel(status: ClubMatch['status']): string {
  switch (status) {
    case 'OPEN':
      return 'Ouvert'
    case 'CLOSED':
      return 'Complet'
    case 'IN_PROGRESS':
      return 'En cours'
    default:
      return 'Terminé'
  }
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-black/20 px-[13px] py-[11px]">
      <div className="text-[10.5px] font-semibold uppercase leading-none tracking-[.14em] text-txt2">
        {label}
      </div>
      <div className="mt-[6px] text-[15px] font-semibold leading-[1.2] text-txt">{children}</div>
    </div>
  )
}

function Impact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-3 py-[13px]">
      <div className="t-num text-[20px] leading-none text-lime">{value}</div>
      <div className="mt-[7px] text-[11.5px] font-medium leading-[1.3] text-txt2">{label}</div>
    </div>
  )
}
