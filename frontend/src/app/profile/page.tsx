'use client'

// Profil : identité, cumul de la saison, détail par compétition, mes vidéos.
// C'est aussi d'ici qu'on bascule le thème, la présentation du feed et du
// classement, et qu'on entre en mode admin.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, MediaPlaceholder, Screen, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason, fullName, initials } from '@/lib/format'
import { usePrefs } from '@/lib/prefs'
import { useSession } from '@/lib/session'
import { useTheme } from '@/lib/theme'
import type { PlayerAggregatedStats, Post, RankingRow } from '@/lib/types'

export default function ProfilePage() {
  const { token, user, profile, isAdmin, logout, loading: sessionLoading } = useSession()
  const { team, championship } = useClub()
  const { label: themeLabel, toggle: toggleTheme } = useTheme()
  const { feedStyle, setFeedStyle, rankStyle, setRankStyle } = usePrefs()

  const [stats, setStats] = useState<PlayerAggregatedStats | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }
    let cancelled = false

    Promise.all([
      api.players.byId(profile.id).catch(() => null),
      api.posts.list({ userId: profile.userId, limit: 12 }).catch(() => null),
      championship
        ? api.championships.ranking(championship.id).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([detail, feed, ranking]) => {
        if (cancelled) return
        setStats(detail?.stats ?? null)
        setPosts(feed?.posts ?? [])
        if (ranking) {
          const idx = ranking.ranking.findIndex((r: RankingRow) => r.player.id === profile.id)
          setRank(idx === -1 ? null : idx + 1)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profile, championship])

  const seasonTiles = useMemo(
    () => [
      { value: stats?.totalGoals ?? 0, label: 'Buts' },
      { value: stats?.totalAssists ?? 0, label: 'Passes déc.' },
      { value: stats?.totalMatches ?? 0, label: 'Matchs' },
      { value: stats?.totalWins ?? 0, label: 'Victoires' },
      { value: stats?.totalPoints ?? 0, label: 'Points' },
      { value: rank ? `${rank}${rank === 1 ? 'er' : 'e'}` : '—', label: 'Classement' },
    ],
    [stats, rank]
  )

  if (sessionLoading || loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={90} className="mb-4 rounded-[20px]" />
          <Skeleton height={200} className="rounded-[16px]" />
        </div>
      </Screen>
    )
  }

  if (!token) {
    return (
      <Screen>
        <EmptyState
          title="Connecte-toi pour voir ton profil"
          hint="Ta fiche, ta carte et le mode admin sont liés à ton compte."
          action={
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/auth/login"
                className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
                style={{ height: 46 }}
              >
                Se connecter
              </Link>
              <Link href="/onboarding" className="text-[13px] font-semibold text-lime">
                Créer ma fiche
              </Link>
            </div>
          }
        />
      </Screen>
    )
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState
          title="Pas encore de fiche joueur"
          hint="Crée ta fiche pour retrouver ici tes stats, tes vidéos et ton classement."
          action={
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/onboarding"
                className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
                style={{ height: 46 }}
              >
                Créer ma fiche
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-[13px] font-semibold text-txt2"
              >
                Se déconnecter
              </button>
            </div>
          }
        />
      </Screen>
    )
  }

  const name = fullName(profile)

  return (
    <Screen>
      {/* Identité */}
      <div className="flex items-start gap-[14px] px-4 pt-[18px]">
        <span
          className="t-num flex h-[74px] w-[74px] flex-none items-center justify-center rounded-[20px] bg-lime-fade text-[26px] text-ink"
          aria-hidden
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-num text-[24px] leading-none text-txt">{name}</h1>
          <p className="mt-[7px] text-[13px] font-medium leading-none text-txt2">
            {user?.username ? `@${user.username} · ` : ''}
            {profile.currentClub || team?.name || 'Sans club'}
            {profile.shirtNumber ? ` · N° ${profile.shirtNumber}` : ''}
          </p>
          <div className="mt-[11px] flex gap-4">
            <Counter value={posts.length} label="vidéos" />
            <Counter value={stats?.totalMatches ?? 0} label="matchs" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-[9px] px-4">
        <Link
          href="/carte"
          className="flex flex-1 items-center justify-center rounded-xl bg-lime text-[14px] font-bold text-ink"
          style={{ height: 44 }}
        >
          Voir ma carte
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-line px-[14px] text-[13.5px] font-semibold text-txt"
          style={{ height: 44 }}
        >
          {themeLabel}
        </button>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center rounded-xl border border-[rgba(198,255,0,.4)] bg-[rgba(198,255,0,.10)] px-[14px] text-[13.5px] font-bold text-lime"
            style={{ height: 44 }}
          >
            Admin
          </Link>
        )}
      </div>

      {/* Cumul de la saison */}
      <div className="t-section mx-4 mt-5">
        Saison {championship?.season ?? currentSeason()} · cumulé
      </div>
      <div className="mx-4 mt-[11px] grid grid-cols-3 gap-[9px]">
        {seasonTiles.map((t) => (
          <div key={t.label} className="rounded-[14px] border border-line bg-surface px-3 py-[13px]">
            <div className="t-num text-[24px] leading-none text-txt">{t.value}</div>
            <div className="mt-[6px] text-[11.5px] font-medium leading-none text-txt2">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {/* Par compétition */}
      <div className="t-section mx-4 mt-5">Par compétition</div>
      <div className="mx-4 mt-[11px] flex flex-col gap-[9px]">
        {(stats?.championships.length ?? 0) === 0 && (
          <p className="px-1 text-[12.5px] leading-[1.45] text-txt2">
            Aucune compétition jouée pour l&apos;instant.
          </p>
        )}
        {stats?.championships.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-[14px] py-[13px]"
          >
            <div className="min-w-0 flex-1">
              <div className="t-item">{c.name}</div>
              <div className="mt-[6px] text-[11.5px] font-medium leading-none text-txt2">
                {c.matches} matchs · {c.goals} buts · {c.assists} passes
              </div>
            </div>
            <div className="text-right">
              <div className="t-num text-[19px] leading-none text-lime">{c.points}</div>
              <div className="mt-1 text-[10.5px] font-medium leading-none text-txt3">points</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mes vidéos */}
      <div className="mx-4 mt-5 flex items-baseline justify-between">
        <span className="t-section">Mes vidéos</span>
        <span className="text-[12px] font-semibold text-lime">{posts.length}</span>
      </div>
      <div className="mx-4 mt-[11px] grid grid-cols-3 gap-[6px]">
        {posts.length === 0 && (
          <p className="col-span-3 px-1 text-[12.5px] leading-[1.45] text-txt2">
            Tu n&apos;as encore rien publié.
          </p>
        )}
        {posts.map((p, i) => (
          <Link
            key={p.id}
            href={`/posts/${p.id}`}
            className="relative overflow-hidden rounded-lg"
            style={{ aspectRatio: '3/4' }}
          >
            {p.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- vignettes servies par /uploads
              <img src={p.thumbnailUrl} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <MediaPlaceholder hue={i} band={12} className="h-full w-full" />
            )}
            <span className="absolute bottom-2 left-0 right-0 truncate px-2 text-center text-[9px] font-medium uppercase text-[rgba(255,255,255,.75)]">
              {p.title}
            </span>
          </Link>
        ))}
      </div>

      {/* Réglages — les variantes que le prototype offrait dans son panneau Tweaks */}
      <div className="t-section mx-4 mt-6">Affichage</div>
      <div className="card-lg mx-4 mt-[11px] flex flex-col gap-4 p-4">
        <SettingRow
          label="Feed"
          options={[
            { id: 'reels', label: 'Plein écran' },
            { id: 'cards', label: 'Fil de cartes' },
          ]}
          value={feedStyle}
          onChange={setFeedStyle}
        />
        <SettingRow
          label="Classement"
          options={[
            { id: 'podium', label: 'Podium' },
            { id: 'table', label: 'Tableau seul' },
          ]}
          value={rankStyle}
          onChange={setRankStyle}
        />
      </div>

      <div className="mx-4 mb-6 mt-4">
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

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-[12.5px] font-medium leading-none text-txt2">
      <span className="t-num text-[15px] leading-none text-txt">{value}</span> {label}
    </span>
  )
}

function SettingRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[13.5px] font-semibold text-txt">{label}</span>
      <div className="flex gap-[6px]">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="h-8 rounded-[9px] px-[11px] text-[12px] font-semibold"
            style={{
              background: value === o.id ? 'var(--lime)' : 'transparent',
              color: value === o.id ? '#12140f' : 'var(--txt2)',
              border: value === o.id ? 'none' : '1px solid var(--line)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
