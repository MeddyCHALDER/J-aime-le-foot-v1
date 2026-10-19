'use client'

// Compétition — deux onglets : le classement des joueurs du championnat en
// cours, et le palmarès de fin de saison.

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, ErrorNote, Screen, Segmented, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason, fullName, initials, shortName } from '@/lib/format'
import { usePrefs } from '@/lib/prefs'
import { useSession } from '@/lib/session'
import type { Award, AwardNomination, RankingRow } from '@/lib/types'

type CompTab = 'ranking' | 'awards'
type SortKey = 'points' | 'goals' | 'assists' | 'matches'

const FILTERS: { id: SortKey; label: string }[] = [
  { id: 'points', label: 'Points' },
  { id: 'goals', label: 'Buts' },
  { id: 'assists', label: 'Passes' },
  { id: 'matches', label: 'Présence' },
]

export default function CompetitionPage() {
  const [tab, setTab] = useState<CompTab>('ranking')

  return (
    <Screen>
      <div className="px-5 pt-[18px]">
        <h1 className="t-title">Compétition</h1>
      </div>
      <Segmented
        className="mx-4 mt-[14px]"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'ranking', label: 'Classement' },
          { id: 'awards', label: 'Palmarès' },
        ]}
      />
      {tab === 'ranking' ? <RankingView /> : <AwardsView />}
    </Screen>
  )
}

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

function RankingView() {
  const { championship, loading: clubLoading } = useClub()
  const { rankStyle } = usePrefs()
  const [rows, setRows] = useState<RankingRow[]>([])
  const [sort, setSort] = useState<SortKey>('points')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (clubLoading) return
    if (!championship) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    // « Présence » n'est pas un tri du backend : on récupère par points et on
    // reclasse côté client.
    const serverSort = sort === 'matches' ? 'points' : sort

    api.championships
      .ranking(championship.id, serverSort)
      .then((res) => {
        if (!cancelled) setRows(res.ranking)
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
  }, [championship, clubLoading, sort])

  const ranking = useMemo(() => {
    if (sort !== 'matches') return rows
    return [...rows].sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.points - a.points)
  }, [rows, sort])

  // Le podium suit l'ordre visuel du design : 2e, 1er, 3e.
  const podium = useMemo(() => {
    if (ranking.length < 3) return []
    return [1, 0, 2].map((i) => ({ row: ranking[i], rank: i + 1 }))
  }, [ranking])

  if (loading) {
    return (
      <div className="px-4 pt-5">
        <Skeleton height={160} className="mb-3 rounded-[16px]" />
        <Skeleton height={280} className="rounded-[16px]" />
      </div>
    )
  }

  if (error) return <ErrorNote>Le classement n&apos;a pas pu être chargé : {error}</ErrorNote>

  if (!championship) {
    return (
      <EmptyState
        title="Pas de championnat en cours"
        hint="Crée un championnat depuis le mode admin pour ouvrir le classement du club."
      />
    )
  }

  if (ranking.length === 0) {
    return (
      <EmptyState
        title="Classement vide"
        hint="Les joueurs apparaîtront ici dès la première feuille de match validée."
      />
    )
  }

  return (
    <>
      {rankStyle === 'podium' && podium.length === 3 && (
        <div className="mx-4 mt-5 grid grid-cols-3 items-end gap-[10px]">
          {podium.map(({ row, rank }) => {
            const first = rank === 1
            const name = `${row.player.firstName} ${row.player.lastName}`
            return (
              <div
                key={row.player.id}
                className="flex flex-col items-center"
                style={{
                  borderRadius: 16,
                  padding: first ? '18px 10px 20px' : '14px 10px 16px',
                  background: first
                    ? 'linear-gradient(160deg,#E8C46A,#F6E7B6 40%,#C99B3B)'
                    : 'var(--surface)',
                  border: first ? 'none' : '1px solid var(--line)',
                }}
              >
                <span
                  className="t-num text-[30px] leading-none"
                  style={{ color: first ? '#2a2410' : 'var(--txt)' }}
                >
                  {rank}
                </span>
                <span
                  className="t-num mt-[10px] flex h-[42px] w-[42px] items-center justify-center rounded-full text-[14px]"
                  style={{
                    background: 'rgba(0,0,0,.22)',
                    color: first ? '#2a2410' : 'var(--txt)',
                  }}
                >
                  {initials(name)}
                </span>
                <span
                  className="mt-[9px] text-center text-[13px] font-bold leading-[1.2]"
                  style={{ color: first ? '#2a2410' : 'var(--txt)' }}
                >
                  {shortName(name)}
                </span>
                <span
                  className="t-num mt-[5px] text-[19px] leading-none"
                  style={{ color: first ? '#2a2410' : 'var(--txt)' }}
                >
                  {row.points}
                </span>
                <span
                  className="mt-[3px] text-[10.5px] font-medium leading-none"
                  style={{ color: first ? 'rgba(42,36,16,.6)' : 'var(--txt2)' }}
                >
                  points
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="no-bar mx-4 mt-[18px] flex gap-[7px] overflow-x-auto">
        {FILTERS.map((f) => {
          const on = sort === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSort(f.id)}
              className="flex h-8 flex-none items-center rounded-[9px] px-[13px] text-[12px] font-semibold"
              style={{
                background: on ? 'var(--lime)' : 'var(--surface)',
                color: on ? '#12140f' : 'var(--txt2)',
                border: on ? 'none' : '1px solid var(--line)',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="mx-4 mb-6 mt-[14px] overflow-hidden rounded-[16px] border border-line bg-surface">
        <div className="grid grid-cols-[34px_1fr_44px_44px_52px] gap-2 border-b border-line px-[14px] py-[11px] text-[10.5px] font-semibold uppercase leading-none tracking-[.12em] text-txt3">
          <span>#</span>
          <span>Joueur</span>
          <span className="text-center">MJ</span>
          <span className="text-center">B</span>
          <span className="text-right">Pts</span>
        </div>

        {ranking.map((r, i) => {
          const leader = i === 0
          return (
            <div
              key={r.player.id}
              className="grid grid-cols-[34px_1fr_44px_44px_52px] items-center gap-2 px-[14px] py-[11px]"
              style={{
                background: leader ? 'rgba(198,255,0,.07)' : 'transparent',
                borderBottom: i === ranking.length - 1 ? 'none' : '1px solid var(--line)',
                borderLeft: `2px solid ${leader ? 'var(--lime)' : 'transparent'}`,
              }}
            >
              <span
                className="t-num text-[15px] leading-none"
                style={{ color: leader ? 'var(--lime)' : 'var(--txt2)' }}
              >
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="truncate text-[14px] font-bold leading-none text-txt">
                  {r.player.firstName} {r.player.lastName}
                </span>
                <span className="text-[11px] font-medium leading-none text-txt3">
                  {r.player.position ?? '—'}
                </span>
              </span>
              <span className="self-center text-center text-[14px] font-semibold leading-none text-txt2">
                {r.matchesPlayed}
              </span>
              <span className="self-center text-center text-[14px] font-semibold leading-none text-txt2">
                {r.goals}
              </span>
              <span
                className="t-num self-center text-right text-[17px] leading-none"
                style={{ color: leader ? 'var(--lime)' : 'var(--txt)' }}
              >
                {r.points}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Palmarès
// ---------------------------------------------------------------------------

/** Libellé et pastille par type de prix, dans l'esprit des trophées du design. */
const AWARD_STYLE: Record<string, { title: string; chip: string; tone: 'gold' | 'silver' | 'lime' }> =
  {
    BALLON_DOR: { title: "Ballon d'Or", chip: 'OR', tone: 'gold' },
    PICHICHI: { title: 'Meilleur buteur', chip: 'OR', tone: 'gold' },
    PUSKAS: { title: 'Plus beau but', chip: 'ARGENT', tone: 'silver' },
    GOLDEN_GLOVE: { title: 'Meilleur gardien', chip: 'GANTS', tone: 'lime' },
    BEST_YOUNG: { title: 'Révélation', chip: 'ESPOIR', tone: 'lime' },
  }

/** Le lauréat : la nomination qui a réuni le plus de voix. */
function winnerOf(award: Award): AwardNomination | null {
  if (!award.nominations?.length) return null
  return [...award.nominations].sort(
    (a, b) => (b._count?.votes ?? 0) - (a._count?.votes ?? 0)
  )[0]
}

function AwardsView() {
  const { profile } = useSession()
  const [awards, setAwards] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.awards
      .list()
      .then((res) => {
        if (!cancelled) setAwards(res)
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
  }, [])

  const ballonDor = useMemo(() => awards.find((a) => a.type === 'BALLON_DOR') ?? null, [awards])
  const others = useMemo(() => awards.filter((a) => a.type !== 'BALLON_DOR'), [awards])

  const mine = useMemo(() => {
    if (!profile) return []
    return awards
      .filter((a) => winnerOf(a)?.playerProfileId === profile.id)
      .map((a) => ({
        title: AWARD_STYLE[a.type]?.title ?? a.name,
        season: a.season ?? currentSeason(),
        tone: AWARD_STYLE[a.type]?.tone ?? 'lime',
      }))
  }, [awards, profile])

  if (loading) {
    return (
      <div className="px-4 pt-5">
        <Skeleton height={180} className="mb-3 rounded-[20px]" />
        <Skeleton height={220} className="rounded-[16px]" />
      </div>
    )
  }

  if (error) return <ErrorNote>Le palmarès n&apos;a pas pu être chargé : {error}</ErrorNote>

  if (awards.length === 0) {
    return (
      <EmptyState
        title="Pas encore de trophées"
        hint="Les prix de fin de saison s'ouvrent depuis le mode admin, puis le club vote."
      />
    )
  }

  const winner = ballonDor ? winnerOf(ballonDor) : null

  return (
    <>
      {ballonDor && (
        <div
          className="relative mx-4 mt-5 overflow-hidden px-5 pb-6 pt-[22px]"
          style={{
            borderRadius: 20,
            background:
              'linear-gradient(150deg,#E8C46A 0%,#F6E7B6 34%,#C99B3B 76%,#F2DFA8 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute animate-shine"
            style={{
              top: '-40%',
              left: 0,
              width: '44%',
              height: '190%',
              background:
                'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))',
            }}
          />
          <div
            className="relative text-[10.5px] font-semibold uppercase leading-none tracking-[.2em]"
            style={{ color: 'rgba(42,36,16,.7)' }}
          >
            Fin de saison {ballonDor.season ?? currentSeason()}
          </div>
          <div
            className="t-num relative mt-[10px] text-[30px] leading-none"
            style={{ color: '#2a2410' }}
          >
            Ballon d&apos;Or
            <br />
            du club
          </div>

          {winner?.playerProfile ? (
            <div className="relative mt-[18px] flex items-center gap-[13px]">
              <span
                className="t-num flex h-[52px] w-[52px] items-center justify-center rounded-full text-[17px]"
                style={{ background: 'rgba(42,36,16,.16)', color: '#2a2410' }}
              >
                {initials(fullName(winner.playerProfile))}
              </span>
              <div>
                <div className="t-num text-[20px] leading-none" style={{ color: '#2a2410' }}>
                  {fullName(winner.playerProfile)}
                </div>
                <div
                  className="mt-[5px] text-[12.5px] font-semibold"
                  style={{ color: 'rgba(42,36,16,.72)' }}
                >
                  {winner._count?.votes ?? 0} voix du club
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative mt-[18px] text-[13px] font-semibold"
              style={{ color: 'rgba(42,36,16,.72)' }}
            >
              Vote en cours — aucun lauréat désigné.
            </div>
          )}
        </div>
      )}

      {others.length > 0 && (
        <div className="mx-4 mt-[14px] grid grid-cols-2 gap-[10px]">
          {others.map((a) => {
            const style = AWARD_STYLE[a.type]
            const w = winnerOf(a)
            return (
              <div
                key={a.id}
                className="flex flex-col gap-[9px] rounded-[16px] border border-line bg-surface px-[14px] py-[15px]"
              >
                <span
                  className="flex h-6 self-start items-center rounded-[7px] px-[9px] text-[10.5px] font-bold leading-none tracking-[.08em]"
                  style={chipStyle(style?.tone ?? 'lime')}
                >
                  {style?.chip ?? 'PRIX'}
                </span>
                <span className="text-[11px] font-semibold uppercase leading-none tracking-[.12em] text-txt2">
                  {style?.title ?? a.name}
                </span>
                <span className="t-num text-[17px] leading-[1.1] text-txt">
                  {w?.playerProfile ? fullName(w.playerProfile) : 'À désigner'}
                </span>
                <span className="t-sub">{w ? `${w._count?.votes ?? 0} voix` : 'Vote ouvert'}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="card-lg mx-4 mb-6 mt-[14px] p-4">
        <div className="t-section">Ton palmarès</div>
        <div className="mt-[13px] flex flex-col gap-[10px]">
          {mine.length === 0 && (
            <p className="text-[12.5px] leading-[1.45] text-txt2">
              Rien encore. Enchaîne les matchs — le classement décide du Ballon d&apos;Or du club.
            </p>
          )}
          {mine.map((t) => (
            <div key={`${t.title}-${t.season}`} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rotate-45 rounded-[3px]"
                style={{ background: toneBackground(t.tone) }}
              />
              <span className="flex-1 text-[13.5px] font-semibold text-txt">{t.title}</span>
              <span className="text-[12px] font-medium text-txt3">{t.season}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function toneBackground(tone: 'gold' | 'silver' | 'lime'): string {
  if (tone === 'gold') return 'linear-gradient(140deg,#E8C46A,#C99B3B)'
  if (tone === 'silver') return 'linear-gradient(140deg,#D8DCD6,#9BA298)'
  return 'var(--lime)'
}

function chipStyle(tone: 'gold' | 'silver' | 'lime'): React.CSSProperties {
  if (tone === 'gold') {
    return { background: 'linear-gradient(140deg,#E8C46A,#C99B3B)', color: '#2a2410' }
  }
  if (tone === 'silver') {
    return { background: 'linear-gradient(140deg,#D8DCD6,#9BA298)', color: '#22261F' }
  }
  return { background: 'rgba(198,255,0,.16)', color: 'var(--lime)' }
}
