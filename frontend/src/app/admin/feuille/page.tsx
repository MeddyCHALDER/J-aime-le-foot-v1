'use client'

// Feuille de match. L'admin coche les présents, saisit les événements minute
// par minute, ajuste les notes, puis valide — et c'est cette validation qui
// pousse les stats et recalcule les cartes.
//
// Le backend stocke un agrégat par joueur (ClubMatchStat : buts, passes,
// cartons), pas une timeline. Les événements vivent donc dans l'écran le temps
// de la saisie, puis sont agrégés à la validation. Les notes de match, elles,
// n'ont pas de champ de stockage : elles servent au calcul, pas à la
// persistance.

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, EmptyState, ErrorNote, Screen, Segmented, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import {
  EVENT_TYPES,
  aggregateEvents,
  autoRating,
  cardAfterMatch,
  impactDelta,
  type EventType,
  type SheetEvent,
} from '@/lib/card-rules'
import { useClub } from '@/lib/club'
import { fullName, initials, longDate } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { ClubMatch, ClubMatchRegistration } from '@/lib/types'

type SheetTab = 'events' | 'squad' | 'ratings'

export default function SheetPageWrapper() {
  return (
    <Suspense
      fallback={
        <Screen>
          <div className="px-4 pt-6">
            <Skeleton height={240} className="rounded-[16px]" />
          </div>
        </Screen>
      }
    >
      <SheetPage />
    </Suspense>
  )
}

function SheetPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { token } = useSession()
  const { team, loading: clubLoading } = useClub()

  const requestedId = params.get('match')

  const [match, setMatch] = useState<ClubMatch | null>(null)
  const [candidates, setCandidates] = useState<ClubMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<SheetTab>('events')
  const [events, setEvents] = useState<SheetEvent[]>([])
  const [absent, setAbsent] = useState<Record<string, boolean>>({})
  const [adjust, setAdjust] = useState<Record<string, number>>({})
  const [composerOpen, setComposerOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  // Chargement du match à saisir : celui demandé, sinon le premier en attente.
  useEffect(() => {
    if (clubLoading) return
    if (!team) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const all = await api.clubMatches.byTeam(team!.id)
        const playable = all
          .filter((m) => m.status !== 'OPEN')
          .sort((a, b) => +new Date(b.matchDate) - +new Date(a.matchDate))
        if (cancelled) return
        setCandidates(playable)

        const targetId = requestedId ?? playable[0]?.id
        if (!targetId) return
        const detail = await api.clubMatches.byId(targetId)
        if (!cancelled) setMatch(detail)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [team, clubLoading, requestedId])

  // Une feuille déjà saisie se rouvre avec ses événements reconstitués.
  useEffect(() => {
    if (!match?.stats?.length) return
    const restored: SheetEvent[] = []
    match.stats.forEach((s) => {
      const name = s.playerProfile ? fullName(s.playerProfile) : 'Joueur'
      const push = (type: EventType, n: number) => {
        for (let i = 0; i < n; i++) {
          restored.push({
            id: `${s.id}-${type}-${i}`,
            minute: 0,
            type,
            playerProfileId: s.playerProfileId,
            playerName: name,
            ours: true,
          })
        }
      }
      push('But', s.goals)
      push('Passe déc.', s.assists)
      push('Carton jaune', s.yellowCards)
      push('Carton rouge', s.redCards)
    })
    setEvents(restored)
    setPublished(true)
  }, [match])

  const roster = useMemo<ClubMatchRegistration[]>(() => match?.registrations ?? [], [match])
  const presentRoster = useMemo(
    () => roster.filter((r) => !absent[r.playerProfileId]),
    [roster, absent]
  )

  const sorted = useMemo(() => [...events].sort((a, b) => a.minute - b.minute), [events])
  const goalsUs = sorted.filter((e) => e.type === 'But' && e.ours).length
  const goalsThem = sorted.filter((e) => e.type === 'But' && !e.ours).length

  /** Événements retenus par joueur — la base des notes et de l'impact carte. */
  const contributions = useMemo(() => {
    const map = new Map<string, EventType[]>()
    for (const e of sorted) {
      if (!e.ours || !e.playerProfileId) continue
      const list = map.get(e.playerProfileId) ?? []
      list.push(e.type)
      map.set(e.playerProfileId, list)
    }
    return map
  }, [sorted])

  const addEvent = useCallback((e: SheetEvent) => {
    setEvents((list) => [...list, e])
    setPublished(false)
    setComposerOpen(false)
  }, [])

  const removeEvent = useCallback((id: string) => {
    setEvents((list) => list.filter((e) => e.id !== id))
    setPublished(false)
  }, [])

  async function publish() {
    if (!token || !match) return
    setPublishing(true)
    setError(null)

    const result = goalsUs > goalsThem ? 'WIN' : goalsUs === goalsThem ? 'DRAW' : 'LOSS'

    try {
      for (const reg of presentRoster) {
        const list = contributions.get(reg.playerProfileId) ?? []
        const totals = aggregateEvents(list)

        await api.clubMatches.saveStat(
          match.id,
          {
            playerProfileId: reg.playerProfileId,
            ...totals,
            matchResult: result,
          },
          token
        )

        // Le fil rouge : la saisie fait bouger la carte.
        const card = reg.playerProfile?.cards?.[0]
        if (card) {
          const next = cardAfterMatch(card, list)
          await api.players.updateCardOf(reg.playerProfileId, next, token)
        }
      }

      if (match.status !== 'COMPLETED') {
        await api.clubMatches.update(match.id, { status: 'COMPLETED' }, token)
      }

      setPublished(true)
      setMatch(await api.clubMatches.byId(match.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La validation a échoué')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={240} className="rounded-[16px]" />
        </div>
      </Screen>
    )
  }

  if (!match) {
    return (
      <Screen>
        <EmptyState
          title="Aucun match à saisir"
          hint="Une feuille s'ouvre dès qu'un match est passé en cours ou terminé."
          action={
            <Link
              href="/admin/creer"
              className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
              style={{ height: 46 }}
            >
              Créer un match
            </Link>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      {/* En-tête */}
      <div className="flex items-center gap-3 px-4 pt-[18px]">
        <Link
          href="/admin"
          aria-label="Retour au club"
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-line text-[15px] font-semibold text-txt"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <div className="t-num text-[19px] leading-none text-txt">Feuille de match</div>
          <div className="t-sub mt-[6px] truncate">
            {match.tournament?.name ?? 'Intra-club'}
            {match.round ? ` J${match.round}` : ''} · {longDate(match.matchDate)}
          </div>
        </div>
        <div className="t-num flex-none text-[22px] leading-none text-lime">
          {goalsUs} — {goalsThem}
        </div>
      </div>

      {/* Sélecteur de match, si plusieurs sont saisissables */}
      {candidates.length > 1 && (
        <div className="no-bar mt-3 flex gap-2 overflow-x-auto px-4">
          {candidates.slice(0, 6).map((c) => {
            const on = c.id === match.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.replace(`/admin/feuille?match=${c.id}`)}
                className="flex h-8 flex-none items-center rounded-[9px] px-3 text-[12px] font-semibold"
                style={{
                  background: on ? 'var(--lime)' : 'var(--surface)',
                  color: on ? '#12140f' : 'var(--txt2)',
                  border: on ? 'none' : '1px solid var(--line)',
                }}
              >
                {longDate(c.matchDate)}
              </button>
            )
          })}
        </div>
      )}

      <Segmented
        className="mx-4 mt-[14px]"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'events', label: 'Événements' },
          { id: 'squad', label: 'Présence' },
          { id: 'ratings', label: 'Notes' },
        ]}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* --- Événements --- */}
      {tab === 'events' && (
        <>
          <div className="mx-4 mt-4 flex flex-col">
            {sorted.length === 0 && (
              <p className="pb-3 text-[12.5px] leading-[1.45] text-txt2">
                Aucun événement saisi. Ajoute le premier but, la première passe.
              </p>
            )}
            {sorted.map((e, i) => (
              <div key={e.id} className="flex items-stretch gap-[13px]">
                <div className="flex w-[44px] flex-none flex-col items-center">
                  <span className="t-num flex h-[26px] w-10 flex-none items-center justify-center rounded-[7px] bg-surface2 text-[13px] leading-none text-txt">
                    {e.minute}&apos;
                  </span>
                  <span
                    className="mt-1 w-px flex-1"
                    style={{
                      background: i === sorted.length - 1 ? 'transparent' : 'var(--line)',
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <div className="flex items-center gap-[11px] rounded-[13px] border border-line bg-surface px-[13px] py-3">
                    <span
                      className="flex h-[26px] flex-none items-center rounded-[7px] px-[10px] text-[11px] font-bold leading-none"
                      style={eventChip(e.type)}
                    >
                      {e.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold leading-[1.2] text-txt">
                        {e.playerName}
                      </div>
                      <div className="t-sub-xs mt-1">
                        {e.ours ? (team?.name ?? 'Notre équipe') : 'Adversaire'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvent(e.id)}
                      aria-label="Retirer l'événement"
                      className="h-7 w-7 flex-none rounded-lg border border-line text-[13px] font-semibold text-txt2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-4 mt-1">
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="btn-dashed w-full rounded-[13px]"
              style={{ height: 50 }}
            >
              + Ajouter un événement
            </button>
          </div>

          <div className="t-section mx-4 mt-[22px]">Impact sur les cartes</div>
          <div className="mx-4 mt-[11px] flex flex-col gap-[9px]">
            {contributions.size === 0 && (
              <p className="px-1 text-[12.5px] leading-[1.45] text-txt2">
                Les joueurs apparaîtront ici dès qu&apos;un événement leur est attribué.
              </p>
            )}
            {[...contributions.entries()].map(([profileId, list]) => {
              const reg = roster.find((r) => r.playerProfileId === profileId)
              const name = reg?.playerProfile ? fullName(reg.playerProfile) : 'Joueur'
              const delta = impactDelta(list)
              return (
                <div
                  key={profileId}
                  className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-[14px] py-3"
                >
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="t-item-sm truncate">{name}</div>
                    <div className="t-sub mt-[5px] truncate">{list.join(' · ')}</div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="t-num text-[17px] leading-none text-lime">
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </div>
                    <div className="mt-1 text-[10.5px] font-medium leading-none text-txt3">
                      note globale
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="h-[22px]" />
        </>
      )}

      {/* --- Présence --- */}
      {tab === 'squad' && (
        <>
          <div className="mx-4 mt-4 flex items-center justify-between">
            <span className="t-section">Présence</span>
            <span className="t-num whitespace-nowrap text-[15px] leading-none text-txt">
              {presentRoster.length} <span className="opacity-45">présents</span>
            </span>
          </div>
          <div className="mx-4 mb-6 mt-[11px] overflow-hidden rounded-[16px] border border-line bg-surface">
            {roster.length === 0 && (
              <p className="px-[14px] py-4 text-[12.5px] leading-[1.45] text-txt2">
                Personne n&apos;était inscrit à ce match.
              </p>
            )}
            {roster.map((r, i) => {
              const name = r.playerProfile ? fullName(r.playerProfile) : 'Joueur'
              const present = !absent[r.playerProfileId]
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-[14px] py-[11px]"
                  style={{
                    borderBottom: i === roster.length - 1 ? 'none' : '1px solid var(--line)',
                    opacity: present ? 1 : 0.5,
                  }}
                >
                  <Avatar name={name} highlight={present} />
                  <div className="min-w-0 flex-1">
                    <div className="t-item-sm truncate">{name}</div>
                    <div className="t-sub-xs mt-1">{r.playerProfile?.position ?? '—'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAbsent((a) => ({ ...a, [r.playerProfileId]: present }))
                      setPublished(false)
                    }}
                    className="h-8 flex-none rounded-[9px] px-[13px] text-[12px] font-bold"
                    style={{
                      background: present ? 'var(--lime)' : 'transparent',
                      color: present ? '#12140f' : 'var(--txt2)',
                      border: present ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    {present ? 'Présent' : 'Absent'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* --- Notes --- */}
      {tab === 'ratings' && (
        <>
          <div className="mx-4 mt-4 rounded-[14px] border border-[rgba(198,255,0,.22)] bg-[rgba(198,255,0,.08)] px-[14px] py-[13px] text-[12.5px] leading-[1.45] text-txt2">
            Les notes sont calculées à partir des événements saisis. Ajuste à la main si le terrain
            disait autre chose.
          </div>
          <div className="mx-4 mb-6 mt-3 flex flex-col gap-[9px]">
            {presentRoster.map((r) => {
              const name = r.playerProfile ? fullName(r.playerProfile) : 'Joueur'
              const list = contributions.get(r.playerProfileId) ?? []
              const auto = autoRating(list)
              const offset = adjust[r.playerProfileId] ?? 0
              const value = Math.max(1, Math.min(10, auto + offset))
              const adjusted = offset !== 0
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-[14px] py-[13px]"
                >
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="t-item-sm truncate">{name}</div>
                    <div className="t-sub-xs mt-[5px]">
                      {adjusted
                        ? `Auto ${auto.toFixed(1)} · ajusté`
                        : `Calculé sur ${list.length} événement${list.length > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-[9px]">
                    <StepButton
                      label="Baisser la note"
                      onClick={() =>
                        setAdjust((a) => ({
                          ...a,
                          [r.playerProfileId]: (a[r.playerProfileId] ?? 0) - 0.5,
                        }))
                      }
                    >
                      −
                    </StepButton>
                    <span
                      className="t-num min-w-[44px] text-center text-[20px] leading-none"
                      style={{ color: adjusted ? 'var(--lime)' : 'var(--txt)' }}
                    >
                      {value.toFixed(1)}
                    </span>
                    <StepButton
                      label="Monter la note"
                      onClick={() =>
                        setAdjust((a) => ({
                          ...a,
                          [r.playerProfileId]: (a[r.playerProfileId] ?? 0) + 0.5,
                        }))
                      }
                    >
                      +
                    </StepButton>
                  </div>
                </div>
              )
            })}
            {presentRoster.length === 0 && (
              <p className="px-1 text-[12.5px] leading-[1.45] text-txt2">
                Aucun joueur présent — coche la présence d&apos;abord.
              </p>
            )}
            <p className="px-1 text-[11.5px] leading-[1.4] text-txt3">
              Les notes de match servent au calcul de l&apos;impact. Elles ne sont pas encore
              stockées côté serveur — seuls les buts, passes et cartons le sont.
            </p>
          </div>
        </>
      )}

      {/* Validation */}
      <div className="mx-4 mb-6">
        <button
          type="button"
          onClick={publish}
          disabled={publishing || presentRoster.length === 0}
          className="w-full rounded-[14px] text-[16px]"
          style={{
            height: 54,
            border: published ? '1px solid rgba(198,255,0,.4)' : 'none',
            background: published ? 'rgba(198,255,0,.10)' : 'var(--lime)',
            color: published ? 'var(--lime)' : '#12140f',
            fontFamily: 'var(--font-chakra), sans-serif',
            fontStyle: 'italic',
            fontWeight: 700,
            boxShadow: published ? 'none' : '0 10px 26px rgba(198,255,0,.22)',
            opacity: publishing ? 0.7 : 1,
            transition: 'all .2s ease',
          }}
        >
          {publishing
            ? 'Mise à jour des cartes…'
            : published
              ? 'Feuille validée'
              : 'Valider et mettre à jour les cartes'}
        </button>
        <p className="mt-[10px] text-center text-[12px] leading-[1.4] text-txt3">
          {published
            ? `${presentRoster.length} cartes mises à jour · classement recalculé`
            : 'Les joueurs verront leurs stats bouger immédiatement.'}
        </p>
      </div>

      {composerOpen && (
        <EventComposer
          roster={presentRoster}
          teamName={team?.name ?? 'Notre équipe'}
          onCancel={() => setComposerOpen(false)}
          onAdd={addEvent}
        />
      )}
    </Screen>
  )
}

// ---------------------------------------------------------------------------

function StepButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-8 w-8 rounded-[9px] border border-line text-[15px] font-semibold text-txt"
    >
      {children}
    </button>
  )
}

function eventChip(type: EventType): React.CSSProperties {
  switch (type) {
    case 'But':
      return { background: 'var(--lime)', color: '#12140f' }
    case 'Passe déc.':
      return { background: 'rgba(198,255,0,.16)', color: 'var(--lime)' }
    case 'Carton jaune':
      return { background: '#E8C46A', color: '#2a2410' }
    case 'Carton rouge':
      return { background: '#FF3B30', color: '#fff' }
    default:
      return { background: 'var(--surface2)', color: 'var(--txt)' }
  }
}

/** Feuille du bas : type, minute, joueur. */
function EventComposer({
  roster,
  teamName,
  onCancel,
  onAdd,
}: {
  roster: ClubMatchRegistration[]
  teamName: string
  onCancel: () => void
  onAdd: (e: SheetEvent) => void
}) {
  const [type, setType] = useState<EventType>('But')
  const [minute, setMinute] = useState(34)
  const [ours, setOurs] = useState(true)
  const [playerId, setPlayerId] = useState<string | null>(roster[0]?.playerProfileId ?? null)

  const selected = roster.find((r) => r.playerProfileId === playerId)

  function submit() {
    onAdd({
      id: `${Date.now()}`,
      minute,
      type,
      playerProfileId: ours ? (playerId ?? null) : null,
      playerName: ours
        ? selected?.playerProfile
          ? fullName(selected.playerProfile)
          : 'Joueur'
        : 'Non attribué',
      ours,
    })
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-end bg-[var(--scrim)]" role="dialog" aria-modal>
      <div
        className="no-bar w-full animate-rise overflow-y-auto border-t border-line bg-bg px-[18px] pb-[26px] pt-[14px]"
        style={{ borderRadius: '22px 22px 44px 44px', maxHeight: '88%', boxSizing: 'border-box' }}
      >
        <div className="mx-auto mb-4 h-1 w-[38px] rounded-[3px] bg-line" />
        <div className="t-num text-[20px] leading-none text-txt">Nouvel événement</div>

        <div className="t-field mt-[18px]">Type</div>
        <div className="mt-[10px] flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="chip-pick"
              style={{ height: 38, borderRadius: 10, padding: '0 14px', fontSize: 13 }}
              data-on={type === t}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-[18px] flex items-center justify-between">
          <span className="t-field">Minute</span>
          <div className="flex items-center gap-[11px]">
            <StepButton label="Minute précédente" onClick={() => setMinute((m) => Math.max(1, m - 1))}>
              −
            </StepButton>
            <span className="t-num min-w-[52px] text-center text-[22px] leading-none text-txt">
              {minute}&apos;
            </span>
            <StepButton label="Minute suivante" onClick={() => setMinute((m) => Math.min(120, m + 1))}>
              +
            </StepButton>
          </div>
        </div>

        <div className="t-field mt-[18px]">Équipe</div>
        <div className="mt-[10px] flex gap-2">
          <button
            type="button"
            className="chip-pick flex-1"
            data-on={ours}
            onClick={() => setOurs(true)}
          >
            {teamName}
          </button>
          <button
            type="button"
            className="chip-pick flex-1"
            data-on={!ours}
            onClick={() => setOurs(false)}
          >
            Adversaire
          </button>
        </div>

        {ours && (
          <>
            <div className="t-field mt-[18px]">Joueur</div>
            <div className="no-bar mt-[10px] flex max-h-[168px] flex-col gap-[7px] overflow-y-auto">
              {roster.length === 0 && (
                <p className="text-[12.5px] text-txt2">Aucun joueur présent.</p>
              )}
              {roster.map((r) => {
                const name = r.playerProfile ? fullName(r.playerProfile) : 'Joueur'
                const on = playerId === r.playerProfileId
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPlayerId(r.playerProfileId)}
                    className="flex items-center gap-[11px] rounded-[11px] px-3"
                    style={{
                      height: 48,
                      background: on ? 'rgba(198,255,0,.10)' : 'transparent',
                      border: `1px solid ${on ? 'rgba(198,255,0,.4)' : 'var(--line)'}`,
                    }}
                  >
                    <span
                      className="t-num flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px]"
                      style={{
                        background: on ? 'var(--lime)' : 'var(--surface2)',
                        color: on ? '#12140f' : 'var(--txt)',
                      }}
                    >
                      {initials(name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-bold text-txt">
                      {name}
                    </span>
                    <span className="t-sub-xs flex-none">{r.playerProfile?.position ?? '—'}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-[18px] flex gap-[9px]">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost rounded-[13px] px-5 text-[14px]"
            style={{ height: 52 }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={ours && !playerId}
            className="btn-lime flex-1 rounded-[13px] text-[16px]"
            style={{ height: 52 }}
          >
            Ajouter à la feuille
          </button>
        </div>
      </div>
    </div>
  )
}
