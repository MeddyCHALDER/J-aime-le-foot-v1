'use client'

// Tableau de bord du club : les indicateurs, la feuille de match qui attend,
// ce qu'il reste à traiter et l'activité récente.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ErrorNote, Screen, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { displayName, longDate, timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { ClubMatch, Post } from '@/lib/types'

export default function AdminHomePage() {
  const { logout } = useSession()
  const { team, championship, loading: clubLoading } = useClub()

  const [matches, setMatches] = useState<ClubMatch[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (clubLoading) return
    if (!team) {
      setLoading(false)
      return
    }
    let cancelled = false

    Promise.all([
      api.clubMatches.byTeam(team.id).catch((err: Error) => {
        if (!cancelled) setError(err.message)
        return [] as ClubMatch[]
      }),
      api.posts.list({ limit: 10 }).catch(() => null),
    ])
      .then(([ms, feed]) => {
        if (cancelled) return
        setMatches(ms)
        setPosts(feed?.posts ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [team, clubLoading])

  /** Une feuille est en attente quand le match est joué mais sans statistique saisie. */
  const pending = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.status === 'COMPLETED' || m.status === 'IN_PROGRESS') &&
            (m._count?.stats ?? 0) === 0
        )
        .sort((a, b) => +new Date(b.matchDate) - +new Date(a.matchDate)),
    [matches]
  )

  const openMatches = useMemo(() => matches.filter((m) => m.status === 'OPEN'), [matches])
  const squadCount = team?.members?.length ?? team?._count?.members ?? 0

  const kpis = [
    { value: String(squadCount), label: 'joueurs actifs', hot: false },
    { value: String(pending.length), label: 'feuille à saisir', hot: pending.length > 0 },
    { value: String(openMatches.length), label: 'matchs ouverts', hot: false },
    {
      value: championship ? `J${maxRound(matches)}` : '—',
      label: championship ? 'journée en cours' : 'pas de championnat',
      hot: false,
    },
  ]

  const next = pending[0] ?? null

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={120} className="mb-3 rounded-[16px]" />
          <Skeleton height={200} className="rounded-[16px]" />
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="flex items-start justify-between gap-3 px-5 pt-[18px]">
        <div>
          <div className="text-[10.5px] font-semibold uppercase leading-none tracking-[.18em] text-lime">
            Mode admin
          </div>
          <div className="t-num mt-[9px] text-[24px] leading-none text-txt">
            {team?.name ?? 'Mon club'}
          </div>
        </div>
        <Link
          href="/profile"
          className="flex h-8 items-center rounded-[9px] border border-line px-3 text-[12px] font-semibold text-txt2"
        >
          Quitter
        </Link>
      </div>

      {error && <ErrorNote>Le club n&apos;a pas pu être chargé : {error}</ErrorNote>}

      {!team && (
        <div className="card-hot mx-4 mt-[18px] px-4 pb-4 pt-[15px]">
          <div className="t-num text-[19px] leading-[1.1] text-txt">Aucune équipe</div>
          <div className="t-sub mt-[7px]">
            Crée le club pour ouvrir les matchs, gérer l&apos;effectif et lancer un championnat.
          </div>
          <Link
            href="/admin/creer"
            className="btn-lime mt-[14px] flex w-full items-center justify-center rounded-xl text-[16px]"
            style={{ height: 48 }}
          >
            Créer une équipe
          </Link>
        </div>
      )}

      {/* Indicateurs */}
      <div className="mx-4 mt-[18px] grid grid-cols-2 gap-[9px]">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[14px] px-[14px] pb-[15px] pt-[14px]"
            style={{
              background: k.hot ? 'rgba(198,255,0,.10)' : 'var(--surface)',
              border: `1px solid ${k.hot ? 'rgba(198,255,0,.28)' : 'var(--line)'}`,
            }}
          >
            <div
              className="t-num text-[26px] leading-none"
              style={{ color: k.hot ? 'var(--lime)' : 'var(--txt)' }}
            >
              {k.value}
            </div>
            <div className="mt-[7px] text-[11.5px] font-medium leading-none text-txt2">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* À traiter */}
      <div className="t-section mx-4 mt-[22px]">À traiter</div>
      <div className="mx-4 mt-[11px] flex flex-col gap-[9px]">
        {next ? (
          <div className="card-hot px-4 pb-4 pt-[15px]">
            <div className="flex items-center gap-2">
              <span className="h-[7px] w-[7px] animate-blip rounded-full bg-lime" />
              <span className="text-[11px] font-semibold uppercase leading-none tracking-[.14em] text-lime">
                Feuille de match en attente
              </span>
            </div>
            <div className="t-num mt-[11px] text-[19px] leading-[1.1] text-txt">
              {next.tournament?.name ?? 'Match intra-club'} · {team?.name ?? 'Le club'}
            </div>
            <div className="t-sub mt-[7px]">
              {longDate(next.matchDate)} · {next._count?.registrations ?? 0} inscrits · 0 événement
              saisi
            </div>
            <Link
              href={`/admin/feuille?match=${next.id}`}
              className="btn-lime mt-[14px] flex w-full items-center justify-center rounded-xl text-[16px]"
              style={{ height: 48 }}
            >
              Saisir la feuille de match
            </Link>
          </div>
        ) : (
          <div className="card px-[14px] py-[13px]">
            <div className="t-item">Aucune feuille en attente</div>
            <div className="t-sub mt-[5px]">Tous les matchs joués ont leurs stats saisies.</div>
          </div>
        )}

        <Todo
          href="/admin/creer"
          tone="ghost"
          title={`${openMatches.length} match${openMatches.length > 1 ? 's' : ''} avec inscriptions ouvertes`}
          sub={
            openMatches[0]
              ? `Prochain : ${longDate(openMatches[0].matchDate)}`
              : 'Ouvre un match pour lancer les inscriptions'
          }
        />
        <Todo
          href="/competition"
          tone="gold"
          title="Prix de fin de saison"
          sub={championship ? `Championnat ${championship.name}` : 'Aucun championnat en cours'}
        />
      </div>

      {/* Activité du club */}
      <div className="t-section mx-4 mt-[22px]">Activité du club</div>
      <div className="card-lg mx-4 mb-6 mt-[11px] px-4 py-[6px]">
        {posts.length === 0 && (
          <div className="py-4 text-[12.5px] leading-[1.45] text-txt2">
            Rien de récent à afficher.
          </div>
        )}
        {posts.slice(0, 5).map((p, i, arr) => (
          <div
            key={p.id}
            className="flex items-center gap-3 py-[13px]"
            style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--line)' }}
          >
            <div className="min-w-0 flex-1 text-[13.5px] font-semibold leading-[1.3] text-txt">
              {displayName(p.user)} a publié « {p.title} »
            </div>
            <div className="flex-none text-[11.5px] font-medium text-txt3">
              {timeAgo(p.createdAt)}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mb-6">
        <button
          type="button"
          onClick={logout}
          className="btn-ghost w-full rounded-xl text-[13.5px]"
          style={{ height: 46 }}
        >
          Se déconnecter
        </button>
      </div>
    </Screen>
  )
}

function maxRound(matches: ClubMatch[]): number {
  return matches.reduce((max, m) => Math.max(max, m.round ?? 0), 0) || 1
}

function Todo({
  href,
  title,
  sub,
  tone,
}: {
  href: string
  title: string
  sub: string
  tone: 'lime' | 'ghost' | 'gold'
}) {
  const dot =
    tone === 'gold'
      ? 'linear-gradient(140deg,#E8C46A,#C99B3B)'
      : tone === 'lime'
        ? 'var(--lime)'
        : 'var(--surface2)'
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-[14px] py-[13px]">
      <span className="h-[10px] w-[10px] flex-none rotate-45 rounded-[3px]" style={{ background: dot }} />
      <div className="min-w-0 flex-1">
        <div className="t-item">{title}</div>
        <div className="t-sub mt-[5px]">{sub}</div>
      </div>
      <span className="text-[18px] font-semibold text-txt3">›</span>
    </Link>
  )
}
