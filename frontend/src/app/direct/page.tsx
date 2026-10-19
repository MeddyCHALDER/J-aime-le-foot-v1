'use client'

// Onglet Direct : le match en cours, ses temps forts, puis les autres flux et
// les rediffusions.
//
// Le club n'a pas encore de service de streaming : il n'existe ni modèle Stream
// ni URL de flux côté backend. L'écran est donc adossé aux matchs du club —
// IN_PROGRESS pour le direct, COMPLETED pour les rediffusions — et les temps
// forts sont déduits des buts saisis sur la feuille de match. Le lecteur reste
// un placeholder tant qu'aucun flux n'est branché.

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, ErrorNote, MediaPlaceholder, Screen, ScreenHeader, Segmented, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { fullName, longDate, timeOf } from '@/lib/format'
import type { ClubMatch } from '@/lib/types'

type LiveTab = 'direct' | 'replay'

export default function DirectPage() {
  const { team, loading: clubLoading } = useClub()
  const [matches, setMatches] = useState<ClubMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<LiveTab>('direct')
  const [chatOpen, setChatOpen] = useState(true)
  const [playing, setPlaying] = useState(true)

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
      .then((res) => {
        if (!cancelled) setMatches(res)
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
  }, [team, clubLoading])

  const live = useMemo(() => matches.filter((m) => m.status === 'IN_PROGRESS'), [matches])
  const replays = useMemo(() => matches.filter((m) => m.status === 'COMPLETED'), [matches])
  const featured = live[0] ?? null

  // Le match mis en avant a besoin de son détail (stats) pour le score et les temps forts.
  const [detail, setDetail] = useState<ClubMatch | null>(null)
  useEffect(() => {
    if (!featured) {
      setDetail(null)
      return
    }
    let cancelled = false
    api.clubMatches
      .byId(featured.id)
      .then((m) => {
        if (!cancelled) setDetail(m)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
    return () => {
      cancelled = true
    }
  }, [featured])

  const score = useMemo(() => scoreOf(detail), [detail])
  const highlights = useMemo(() => highlightsOf(detail), [detail])

  const listed = tab === 'direct' ? live.slice(featured ? 1 : 0) : replays

  return (
    <Screen>
      <ScreenHeader
        title="Direct"
        right={
          <span className="flex h-8 items-center gap-[7px] rounded-[9px] bg-[rgba(255,59,48,.14)] px-3">
            <span className="h-[7px] w-[7px] animate-blip rounded-full bg-live" />
            <span className="text-[11px] font-bold uppercase leading-none tracking-[.14em] text-[#FF6259]">
              {live.length} en cours
            </span>
          </span>
        }
      />

      {error && <ErrorNote>Les matchs n&apos;ont pas pu être chargés : {error}</ErrorNote>}

      {loading && (
        <div className="px-4 pt-4">
          <Skeleton height={330} className="rounded-[18px]" />
        </div>
      )}

      {!loading && !featured && (
        <EmptyState
          title="Aucun match en direct"
          hint="Quand l'admin passe un match en cours, il apparaît ici avec son score et ses temps forts."
        />
      )}

      {!loading && featured && (
        <div className="mx-4 mt-4 overflow-hidden rounded-[18px] border border-line bg-surface">
          {/* Lecteur */}
          <div className="relative">
            <MediaPlaceholder hue={0} band={18} style={{ height: 212 }} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0) 40%,rgba(0,0,0,.75))',
              }}
            />

            <div className="absolute left-3 top-3 flex gap-[7px]">
              <span className="flex h-[26px] items-center gap-[6px] rounded-[7px] bg-live px-[10px]">
                <span className="h-[6px] w-[6px] animate-blip rounded-full bg-white" />
                <span className="text-[11px] font-bold uppercase leading-none tracking-[.14em] text-white">
                  Live
                </span>
              </span>
              <span className="flex h-[26px] items-center rounded-[7px] bg-black/50 px-[10px] text-[11px] font-semibold leading-none text-white">
                {timeOf(featured.matchDate)}
              </span>
            </div>

            <span className="absolute right-3 top-3 flex h-[26px] items-center rounded-[7px] bg-black/50 px-[10px] text-[11px] font-semibold leading-none text-white">
              {featured._count?.registrations ?? 0} inscrits
            </span>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Mettre en pause' : 'Lire'}
                className="h-[58px] w-[58px] rounded-full border border-white/30 bg-black/40 text-[18px] text-white backdrop-blur-[8px]"
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <div className="t-mono mt-[10px] text-[rgba(255,255,255,.45)]">
                FLUX NON CONNECTÉ
              </div>
            </div>

            <div className="absolute bottom-3 left-[14px] right-[14px] flex items-center gap-3">
              <div className="flex items-center gap-[9px]">
                <span className="t-num text-[15px] leading-none text-white">
                  {(team?.name ?? 'CLUB').toUpperCase()}
                </span>
                <span className="t-num text-[20px] leading-none text-lime">{score}</span>
              </div>
              <div className="flex-1" />
              <span className="flex h-[26px] items-center rounded-[7px] border border-white/30 px-[10px] text-[11px] font-semibold leading-none text-white">
                HD
              </span>
            </div>
          </div>

          {/* Titre du match */}
          <div className="px-4 pt-[14px]">
            <div className="text-[16px] font-bold leading-[1.2] text-txt">
              {featured.tournament?.name ?? 'Match intra-club'}
              {featured.round ? ` J${featured.round}` : ''} · {team?.name ?? 'Le club'}
            </div>
            <div className="t-sub mt-[6px]">{longDate(featured.matchDate)}</div>
          </div>

          {/* Actions */}
          <div className="flex gap-[9px] px-4 pb-4 pt-[14px]">
            <button
              type="button"
              onClick={() => setChatOpen((c) => !c)}
              className="flex-1 rounded-xl text-[13.5px] font-bold"
              style={{
                height: 44,
                border: chatOpen ? '1px solid var(--line)' : 'none',
                background: chatOpen ? 'transparent' : 'var(--lime)',
                color: chatOpen ? 'var(--txt)' : '#12140f',
              }}
            >
              {chatOpen ? 'Masquer le chat' : 'Chat en direct'}
            </button>
            <span className="flex h-11 items-center rounded-xl border border-line px-4 text-[13.5px] font-semibold text-txt2">
              Compo
            </span>
            <span className="flex h-11 items-center rounded-xl border border-line px-4 text-[13.5px] font-semibold text-txt2">
              ↗
            </span>
          </div>

          {chatOpen && (
            <div className="border-t border-line px-4 pb-4 pt-[14px]">
              <p className="text-[12.5px] leading-[1.45] text-txt2">
                Le chat en direct n&apos;est pas encore branché — il attend un service temps réel
                côté serveur.
              </p>
              <div className="mt-3 flex h-11 items-center rounded-xl border border-line bg-surface2 px-[14px] text-[13.5px] text-txt3">
                Écrire un message…
              </div>
            </div>
          )}
        </div>
      )}

      {highlights.length > 0 && (
        <>
          <div className="t-section mx-4 mt-5">Temps forts du match</div>
          <div className="no-bar mt-[11px] flex gap-[9px] overflow-x-auto px-4">
            {highlights.map((h, i) => (
              <div
                key={`${h.minute}-${h.title}`}
                className="relative flex-none overflow-hidden rounded-xl"
                style={{ width: 132, height: 88 }}
              >
                <MediaPlaceholder hue={i} band={14} className="absolute inset-0" />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.8))',
                  }}
                />
                <span className="absolute left-2 top-2 flex h-[22px] items-center rounded-md bg-black/55 px-2 text-[10.5px] font-bold leading-none text-lime">
                  {h.minute}
                </span>
                <span className="absolute bottom-[9px] left-[9px] right-[9px] text-[12px] font-semibold leading-[1.25] text-white">
                  {h.title}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Segmented
        className="mx-4 mt-[22px]"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'direct', label: 'En direct' },
          { id: 'replay', label: 'Rediffusions' },
        ]}
      />

      <div className="mx-4 mb-6 mt-3 flex flex-col gap-[9px]">
        {listed.length === 0 && (
          <EmptyState
            title={tab === 'direct' ? 'Pas d’autre flux en cours' : 'Aucune rediffusion'}
            hint={
              tab === 'direct'
                ? 'Les autres matchs du club apparaîtront ici dès qu’ils passent en cours.'
                : 'Les matchs terminés seront proposés en rediffusion une fois les flux archivés.'
            }
          />
        )}

        {listed.map((m, i) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-[10px]"
          >
            <div
              className="relative flex-none overflow-hidden rounded-[10px]"
              style={{ width: 96, height: 62 }}
            >
              <MediaPlaceholder hue={i} band={12} className="absolute inset-0" />
              <span
                className="absolute bottom-[6px] left-[6px] flex h-5 items-center rounded-[5px] px-[7px] text-[10px] font-bold leading-none tracking-[.08em] text-white"
                style={{ background: m.status === 'IN_PROGRESS' ? '#FF3B30' : 'rgba(0,0,0,.6)' }}
              >
                {m.status === 'IN_PROGRESS' ? 'LIVE' : 'REPLAY'}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div className="t-item truncate">
                {m.tournament?.name ?? 'Match intra-club'}
                {m.round ? ` · J${m.round}` : ''}
              </div>
              <div className="t-sub">{longDate(m.matchDate)}</div>
              <div className="t-sub-xs">{m._count?.registrations ?? 0} joueurs inscrits</div>
            </div>

            <span
              className="flex h-[34px] flex-none items-center rounded-[10px] px-[14px] text-[12.5px] font-bold"
              style={{
                background: m.status === 'IN_PROGRESS' ? 'var(--lime)' : 'transparent',
                color: m.status === 'IN_PROGRESS' ? '#12140f' : 'var(--txt2)',
                border: m.status === 'IN_PROGRESS' ? 'none' : '1px solid var(--line)',
              }}
            >
              {m.status === 'IN_PROGRESS' ? 'Voir' : 'Revoir'}
            </span>
          </div>
        ))}
      </div>
    </Screen>
  )
}

/** Score reconstitué depuis la feuille : les buts groupés par équipe du match. */
function scoreOf(match: ClubMatch | null): string {
  if (!match?.stats?.length) return '0 — 0'
  const byTeam = new Map<string, number>()
  for (const s of match.stats) {
    const key = s.teamId ?? 'club'
    byTeam.set(key, (byTeam.get(key) ?? 0) + s.goals)
  }
  const values = [...byTeam.values()]
  if (values.length >= 2) return `${values[0]} — ${values[1]}`
  return `${values[0] ?? 0} — 0`
}

/** Temps forts déduits des buts et passes décisives saisis. */
function highlightsOf(match: ClubMatch | null): { minute: string; title: string }[] {
  if (!match?.stats?.length) return []
  const out: { minute: string; title: string }[] = []
  for (const s of match.stats) {
    const name = s.playerProfile ? fullName(s.playerProfile) : 'Joueur'
    const last = name.split(' ').slice(-1)[0]
    for (let i = 0; i < s.goals; i++) out.push({ minute: '—', title: `But — ${last}` })
    for (let i = 0; i < s.assists; i++) out.push({ minute: '—', title: `Passe — ${last}` })
  }
  return out.slice(0, 8)
}
