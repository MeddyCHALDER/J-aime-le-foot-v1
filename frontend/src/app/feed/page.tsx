'use client'

// Feed vidéo. Deux présentations, au choix du joueur depuis le Profil :
// plein écran type reels (défaut du design) ou fil de cartes.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState, ErrorNote, MediaPlaceholder, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { displayName, initials, timeAgo } from '@/lib/format'
import { usePrefs } from '@/lib/prefs'
import { useSession } from '@/lib/session'
import type { Post } from '@/lib/types'

type FeedTab = 'club' | 'discover' | 'following'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'club', label: 'Mon club' },
  { id: 'discover', label: 'Découvrir' },
  { id: 'following', label: 'Suivis' },
]

export default function FeedPage() {
  const { token, user, profile, loading: sessionLoading } = useSession()
  const { team } = useClub()
  const { feedStyle } = usePrefs()

  const [tab, setTab] = useState<FeedTab>('club')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  // Les identifiants des coéquipiers servent à filtrer l'onglet « Mon club ».
  const clubUserIds = useMemo(() => {
    const ids = new Set<string>()
    team?.members?.forEach((m) => {
      const id = m.playerProfile?.user?.id
      if (id) ids.add(id)
    })
    return ids
  }, [team])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.posts
      .list({ limit: 30 })
      .then((res) => {
        if (cancelled) return
        setPosts(res.posts)
        // État initial des likes du joueur connecté.
        if (user) {
          const mine: Record<string, boolean> = {}
          res.posts.forEach((p) => {
            if (p.likes?.some((l) => l.userId === user.id)) mine[p.id] = true
          })
          setLiked(mine)
        }
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
  }, [user])

  const visible = useMemo(() => {
    if (tab === 'club') {
      // Sans effectif chargé, « Mon club » montre tout plutôt que rien.
      if (clubUserIds.size === 0) return posts
      return posts.filter((p) => clubUserIds.has(p.userId))
    }
    if (tab === 'following') return []
    return posts
  }, [tab, posts, clubUserIds])

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!token) return
      const was = !!liked[post.id]
      setLiked((l) => ({ ...l, [post.id]: !was }))
      try {
        const res = await api.posts.like(post.id, token)
        setLiked((l) => ({ ...l, [post.id]: res.liked }))
      } catch {
        setLiked((l) => ({ ...l, [post.id]: was }))
      }
    },
    [token, liked]
  )

  const likeCount = useCallback(
    (post: Post) => {
      const base = post._count?.likes ?? post.likes?.length ?? 0
      const wasLiked = !!post.likes?.some((l) => l.userId === user?.id)
      const now = !!liked[post.id]
      return base + (now ? 1 : 0) - (wasLiked ? 1 : 0)
    },
    [liked, user]
  )

  // Pas de compte, ou compte sans fiche : on renvoie vers l'onboarding.
  if (!sessionLoading && (!token || !profile)) {
    return <NoProfile hasAccount={!!token} />
  }

  const shared = {
    tab,
    setTab,
    posts: visible,
    loading,
    error,
    liked,
    toggleLike,
    likeCount,
    clubName: team?.name ?? null,
  }

  return feedStyle === 'reels' ? <ReelsFeed {...shared} /> : <CardsFeed {...shared} />
}

interface FeedProps {
  tab: FeedTab
  setTab: (t: FeedTab) => void
  posts: Post[]
  loading: boolean
  error: string | null
  liked: Record<string, boolean>
  toggleLike: (p: Post) => void
  likeCount: (p: Post) => number
  clubName: string | null
}

function authorOf(post: Post): string {
  return displayName(post.user)
}

// ---------------------------------------------------------------------------
// Plein écran
// ---------------------------------------------------------------------------

function ReelsFeed({
  tab,
  setTab,
  posts,
  loading,
  error,
  liked,
  toggleLike,
  likeCount,
  clubName,
}: FeedProps) {
  return (
    <div className="no-bar absolute inset-0 snap-y snap-mandatory overflow-y-auto bg-black">
      {loading && <ReelSkeleton />}
      {!loading && error && (
        <div className="relative pt-16">
          <FeedTabs tab={tab} setTab={setTab} floating />
          <ErrorNote>Le feed n&apos;a pas pu être chargé : {error}</ErrorNote>
        </div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="relative pt-16">
          <FeedTabs tab={tab} setTab={setTab} floating />
          <EmptyFeed tab={tab} />
        </div>
      )}

      {posts.map((post, i) => (
        <article
          key={post.id}
          className="relative snap-start overflow-hidden bg-[#0b0c0a]"
          style={{ height: '100%', minHeight: 740 }}
        >
          {post.videoUrl ? (
            <video
              src={post.videoUrl}
              poster={post.thumbnailUrl ?? undefined}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              loop
            />
          ) : (
            <MediaPlaceholder hue={i} band={18} className="absolute inset-0" />
          )}

          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 45%,rgba(0,0,0,.82) 100%)',
            }}
          />

          {i === 0 && <FeedTabs tab={tab} setTab={setTab} floating />}

          {/* Rail d'actions */}
          <div className="absolute bottom-[120px] right-4 flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={() => toggleLike(post)}
              aria-pressed={!!liked[post.id]}
              aria-label="J'aime"
              className="flex h-12 w-12 items-center justify-center rounded-full text-[22px] backdrop-blur-[8px] transition-[transform,background] duration-150"
              style={{
                background: liked[post.id] ? 'var(--lime)' : 'rgba(255,255,255,.12)',
                color: liked[post.id] ? '#12140f' : '#fff',
                transform: liked[post.id] ? 'scale(1.08)' : 'none',
              }}
            >
              ♥
            </button>
            <span className="-mt-[14px] text-[12px] font-semibold leading-none text-white">
              {likeCount(post)}
            </span>

            <Link
              href={`/posts/${post.id}`}
              aria-label="Commentaires"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,.12)] text-[18px] font-semibold text-white backdrop-blur-[8px]"
            >
              ···
            </Link>
            <span className="-mt-[14px] text-[12px] font-semibold leading-none text-white">
              {post._count?.comments ?? post.comments?.length ?? 0}
            </span>

            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,.12)] text-[20px] font-semibold text-white backdrop-blur-[8px]">
              ↗
            </span>
          </div>

          {/* Bloc auteur et légende */}
          <div className="absolute bottom-[104px] left-[22px] right-24 flex flex-col gap-3">
            <div className="flex items-center gap-[10px]">
              <span className="t-num flex h-[38px] w-[38px] items-center justify-center rounded-full bg-lime-fade text-[14px] text-ink">
                {initials(authorOf(post))}
              </span>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[15px] font-bold leading-none text-white">
                  {authorOf(post)}
                </span>
                <span className="text-[12px] font-medium leading-none text-[rgba(255,255,255,.6)]">
                  {timeAgo(post.createdAt)}
                  {clubName ? ` · ${clubName}` : ''}
                </span>
              </div>
            </div>
            {post.description && (
              <p className="text-[14px] leading-[1.45] text-[rgba(255,255,255,.92)] [text-wrap:pretty]">
                {post.description}
              </p>
            )}
            <div className="flex flex-wrap gap-[7px]">
              <span className="flex h-7 items-center rounded-lg bg-[rgba(198,255,0,.16)] px-[11px] text-[12px] font-semibold text-lime">
                {post.title}
              </span>
              {clubName && (
                <span className="flex h-7 items-center rounded-lg bg-[rgba(255,255,255,.12)] px-[11px] text-[12px] font-semibold text-white">
                  {clubName}
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fil de cartes
// ---------------------------------------------------------------------------

function CardsFeed({ tab, setTab, posts, loading, error, liked, toggleLike, likeCount }: FeedProps) {
  return (
    <div className="no-bar absolute inset-0 overflow-y-auto bg-bg">
      <div
        className="sticky top-0 z-[5] border-b border-line bg-bg px-5 pb-3"
        style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}
      >
        <FeedTabs tab={tab} setTab={setTab} />
      </div>

      <div className="flex flex-col gap-[14px] px-4 pb-6 pt-[14px]">
        {loading &&
          [0, 1, 2].map((i) => <Skeleton key={i} height={300} className="rounded-[18px]" />)}
        {!loading && error && <ErrorNote>Le feed n&apos;a pas pu être chargé : {error}</ErrorNote>}
        {!loading && !error && posts.length === 0 && <EmptyFeed tab={tab} />}

        {posts.map((post, i) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-[18px] border border-line bg-surface"
          >
            <div className="flex items-center gap-[10px] px-[14px] py-[13px]">
              <span className="t-num flex h-[34px] w-[34px] items-center justify-center rounded-full bg-lime-fade text-[13px] text-ink">
                {initials(authorOf(post))}
              </span>
              <div className="flex flex-1 flex-col gap-[3px]">
                <span className="t-item">{authorOf(post)}</span>
                <span className="t-sub-xs">{timeAgo(post.createdAt)}</span>
              </div>
              <span className="flex h-[26px] items-center rounded-[7px] bg-[rgba(198,255,0,.14)] px-[10px] text-[11px] font-semibold text-lime">
                {post.title}
              </span>
            </div>

            {post.videoUrl ? (
              <video
                src={post.videoUrl}
                poster={post.thumbnailUrl ?? undefined}
                className="h-[190px] w-full object-cover"
                playsInline
                muted
                controls
              />
            ) : (
              <MediaPlaceholder hue={i} label="VIDÉO" style={{ height: 190 }} />
            )}

            <div className="flex flex-col gap-[11px] px-[14px] pb-[14px] pt-3">
              {post.description && <p className="t-body">{post.description}</p>}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleLike(post)}
                  aria-pressed={!!liked[post.id]}
                  className="text-[13px] font-semibold leading-none"
                  style={{ color: liked[post.id] ? 'var(--lime)' : 'var(--txt2)' }}
                >
                  ♥ {likeCount(post)}
                </button>
                <Link href={`/posts/${post.id}`} className="text-[13px] font-semibold text-txt2">
                  ··· {post._count?.comments ?? post.comments?.length ?? 0}
                </Link>
                <span className="text-[13px] font-semibold text-txt2">↗ Partager</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FeedTabs({
  tab,
  setTab,
  floating = false,
}: {
  tab: FeedTab
  setTab: (t: FeedTab) => void
  floating?: boolean
}) {
  return (
    <div
      className={floating ? 'absolute left-[22px] right-[22px] z-10 flex gap-[22px]' : 'flex gap-5'}
      style={floating ? { top: 'calc(var(--safe-top) + 14px)' } : undefined}
    >
      {TABS.map((t) => {
        const on = tab === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="pb-[7px] text-[14px] font-semibold leading-none"
            style={{
              color: on
                ? floating
                  ? '#fff'
                  : 'var(--txt)'
                : floating
                  ? 'rgba(255,255,255,.5)'
                  : 'var(--txt2)',
              borderBottom: on ? '2px solid var(--lime)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyFeed({ tab }: { tab: FeedTab }) {
  if (tab === 'following') {
    return (
      <EmptyState
        title="Les abonnements arrivent"
        hint="Le suivi entre joueurs n'existe pas encore côté serveur. En attendant, « Mon club » et « Découvrir » montrent toutes les actions publiées."
      />
    )
  }
  return (
    <EmptyState
      title="Rien à voir pour l'instant"
      hint="Poste ta première action — un but, un geste technique — et elle apparaîtra ici."
    />
  )
}

function ReelSkeleton() {
  return (
    <div className="relative h-full min-h-[740px] animate-pulse bg-[#111]" aria-hidden>
      <div className="absolute bottom-[104px] left-[22px] right-24 flex flex-col gap-3">
        <div className="h-[38px] w-[38px] rounded-full bg-[var(--track)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--track)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--track)]" />
      </div>
    </div>
  )
}

function NoProfile({ hasAccount }: { hasAccount: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 bg-bg px-8 text-center">
      <h1 className="t-num text-[30px] leading-[1.05] text-txt">
        Ta fiche
        <br />
        commence ici
      </h1>
      <p className="max-w-[30ch] text-[14px] leading-[1.5] text-txt2">
        {hasAccount
          ? 'Ton compte existe, il te manque la fiche joueur. Deux minutes et ta carte est prête.'
          : 'Les pros ont une carte. Toi aussi, maintenant.'}
      </p>
      <Link
        href="/onboarding"
        className="btn-lime flex items-center justify-center rounded-[14px] px-7 text-[17px]"
        style={{ height: 54 }}
      >
        Créer ma carte
      </Link>
      {!hasAccount && (
        <p className="text-[13px] text-txt2">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="font-semibold text-lime">
            Se connecter
          </Link>
        </p>
      )}
    </div>
  )
}
