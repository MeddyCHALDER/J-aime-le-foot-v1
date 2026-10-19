'use client'

// Profil public d'un joueur : sa carte, son cumul et ses vidéos.
// Atteint depuis le classement, l'effectif ou un post du feed.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PlayerCard from '@/components/PlayerCard'
import { EmptyState, ErrorNote, MediaPlaceholder, Screen, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason, fullName, initials } from '@/lib/format'
import type { PlayerDetail, Post } from '@/lib/types'

export default function PublicProfile({
  load,
}: {
  /** Résolution du joueur — par identifiant de profil ou par pseudo. */
  load: () => Promise<PlayerDetail>
}) {
  const router = useRouter()
  const { championship } = useClub()
  const [data, setData] = useState<PlayerDetail | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    load()
      .then(async (detail) => {
        if (cancelled) return
        setData(detail)
        const feed = await api.posts
          .list({ userId: detail.profile.userId, limit: 9 })
          .catch(() => null)
        if (!cancelled) setPosts(feed?.posts ?? [])
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
    // `load` est recréé à chaque rendu de la page appelante ; la dépendance
    // utile est l'identifiant, capturé dans la closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={90} className="mb-4 rounded-[20px]" />
          <Skeleton height={300} className="rounded-[22px]" />
        </div>
      </Screen>
    )
  }

  if (!data) {
    return (
      <Screen>
        <ErrorNote>{error ?? 'Joueur introuvable.'}</ErrorNote>
      </Screen>
    )
  }

  const { profile, stats } = data
  const name = fullName(profile)
  const card = profile.cards?.[0] ?? null

  return (
    <Screen>
      <div className="flex items-start gap-[14px] px-4 pt-[18px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="h-[34px] w-[34px] flex-none rounded-[10px] border border-line text-[15px] font-semibold text-txt"
        >
          ‹
        </button>
        <span
          className="t-num flex h-[56px] w-[56px] flex-none items-center justify-center rounded-[16px] bg-lime-fade text-[20px] text-ink"
          aria-hidden
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-num text-[22px] leading-none text-txt">{name}</h1>
          <p className="mt-[7px] text-[13px] font-medium leading-none text-txt2">
            {profile.user?.username ? `@${profile.user.username} · ` : ''}
            {profile.currentClub || 'Sans club'}
            {profile.shirtNumber ? ` · N° ${profile.shirtNumber}` : ''}
          </p>
        </div>
      </div>

      {card ? (
        <div className="flex justify-center py-[22px]">
          <PlayerCard profile={profile} card={card} />
        </div>
      ) : (
        <EmptyState title="Pas encore de carte" hint="Ce joueur n'a pas généré sa carte." />
      )}

      <div className="t-section mx-4 mt-2">
        Saison {championship?.season ?? currentSeason()} · cumulé
      </div>
      <div className="mx-4 mt-[11px] grid grid-cols-3 gap-[9px]">
        {[
          { value: stats.totalGoals, label: 'Buts' },
          { value: stats.totalAssists, label: 'Passes déc.' },
          { value: stats.totalMatches, label: 'Matchs' },
          { value: stats.totalWins, label: 'Victoires' },
          { value: stats.totalPoints, label: 'Points' },
          { value: profile.position ?? '—', label: 'Poste' },
        ].map((t) => (
          <div key={t.label} className="rounded-[14px] border border-line bg-surface px-3 py-[13px]">
            <div className="t-num text-[24px] leading-none text-txt">{t.value}</div>
            <div className="mt-[6px] text-[11.5px] font-medium leading-none text-txt2">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {posts.length > 0 && (
        <>
          <div className="t-section mx-4 mt-5">Ses vidéos</div>
          <div className="mx-4 mb-6 mt-[11px] grid grid-cols-3 gap-[6px]">
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
              </Link>
            ))}
          </div>
        </>
      )}
      <div className="h-6" />
    </Screen>
  )
}
