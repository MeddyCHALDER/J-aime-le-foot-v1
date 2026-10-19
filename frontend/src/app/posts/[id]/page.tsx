'use client'

// Détail d'une action : la vidéo, sa légende et les commentaires.
// C'est la destination du compteur de commentaires du feed.

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, ErrorNote, MediaPlaceholder, Screen, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { displayName, timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { Post } from '@/lib/types'

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { token, user } = useSession()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setPost(await api.posts.byId(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action introuvable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function send() {
    if (!token || !draft.trim()) return
    setSending(true)
    try {
      await api.posts.comment(id, draft.trim(), token)
      setDraft('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commentaire refusé')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={260} className="rounded-[18px]" />
        </div>
      </Screen>
    )
  }

  if (!post) {
    return (
      <Screen>
        <ErrorNote>{error ?? 'Action introuvable.'}</ErrorNote>
      </Screen>
    )
  }

  const author = displayName(post.user)

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
          <div className="t-num truncate text-[19px] leading-none text-txt">{post.title}</div>
          <div className="t-sub mt-[6px]">
            {author} · {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 overflow-hidden rounded-[18px] border border-line bg-surface">
        {post.videoUrl ? (
          <video
            src={post.videoUrl}
            poster={post.thumbnailUrl ?? undefined}
            className="h-[240px] w-full object-cover"
            playsInline
            controls
          />
        ) : (
          <MediaPlaceholder label="VIDÉO" style={{ height: 240 }} />
        )}
        {post.description && <p className="t-body px-4 py-[14px]">{post.description}</p>}
      </div>

      <div className="t-section mx-4 mt-5">
        Commentaires · {post._count?.comments ?? post.comments?.length ?? 0}
      </div>

      <div className="mx-4 mt-3 flex flex-col gap-3">
        {(post.comments?.length ?? 0) === 0 && (
          <p className="text-[12.5px] leading-[1.45] text-txt2">
            Personne n&apos;a encore réagi. Lance la discussion.
          </p>
        )}
        {post.comments?.map((c) => {
          const name = displayName(c.user)
          return (
            <div key={c.id} className="flex items-start gap-[9px]">
              <Avatar name={name} size={30} highlight={c.userId === user?.id} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold leading-none text-txt2">{name}</div>
                <p className="mt-1 text-[13.5px] leading-[1.35] text-txt [text-wrap:pretty]">
                  {c.content}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mx-4 mb-6 mt-4 flex gap-2">
        <input
          className="field-box flex-1"
          value={draft}
          placeholder={token ? 'Écrire un commentaire…' : 'Connecte-toi pour commenter'}
          disabled={!token || sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!token || sending || !draft.trim()}
          className="btn-lime rounded-xl px-4 text-[14px]"
          style={{ height: 52 }}
        >
          Envoyer
        </button>
      </div>
    </Screen>
  )
}
