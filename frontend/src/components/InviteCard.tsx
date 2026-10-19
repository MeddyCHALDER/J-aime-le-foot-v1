'use client'

// Bloc admin : fabrique le lien d'invitation du club et le donne à partager.
// Le régénérer révoque le précédent — c'est le seul moyen de couper l'accès à
// quelqu'un qui aurait déjà reçu l'ancien.

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { TeamInvite } from '@/lib/types'

export default function InviteCard({ teamId }: { teamId: string }) {
  const { token } = useSession()
  const [invite, setInvite] = useState<TeamInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api.teams
      .invite(teamId, token)
      .then((i) => !cancelled && setInvite(i))
      .catch(() => !cancelled && setInvite(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [teamId, token])

  const generate = useCallback(async () => {
    if (!token) return
    setWorking(true)
    setError(null)
    try {
      setInvite(await api.teams.createInvite(teamId, token))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le lien')
    } finally {
      setWorking(false)
    }
  }, [teamId, token])

  // L'URL se compose côté navigateur : le backend ne connaît pas le domaine du front.
  const url = invite ? `${window.location.origin}/invite/${invite.token}` : ''

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard refusée (http, permission) : le champ reste sélectionnable.
      setError('Copie impossible — sélectionne le lien à la main.')
    }
  }, [url])

  const share = useCallback(async () => {
    // Sur mobile, le partage natif ouvre WhatsApp et consorts directement.
    if (!navigator.share) return copy()
    try {
      await navigator.share({ title: 'Rejoins le club', url })
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
  }, [url, copy])

  if (loading) return null

  return (
    <div className="card-lg mx-4 mt-[14px] p-4">
      <div className="t-section">Inviter des joueurs</div>

      {!invite ? (
        <>
          <p className="t-body mt-2" style={{ color: 'var(--txt2)' }}>
            Crée un lien à envoyer à tes joueurs. L&apos;ouvrir leur fait créer leur fiche et
            les ajoute à l&apos;effectif.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={working}
            className="t-num mt-4 h-11 w-full rounded-[12px] bg-lime text-ink disabled:opacity-60"
            style={{ fontSize: 15 }}
          >
            {working ? '…' : 'Créer le lien d’invitation'}
          </button>
        </>
      ) : (
        <>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="field-box mt-3 w-full"
            style={{ minHeight: 44, height: 44, fontSize: 12, fontWeight: 400 }}
          />
          <div className="mt-[10px] flex gap-[9px]">
            <button
              type="button"
              onClick={share}
              className="t-num h-11 flex-1 rounded-[12px] bg-lime text-ink"
              style={{ fontSize: 15 }}
            >
              {copied ? 'Lien copié' : 'Partager'}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={working}
              className="h-11 rounded-[12px] px-4 text-[13.5px] font-semibold disabled:opacity-60"
              style={{ border: '1px solid var(--line)', color: 'var(--txt2)' }}
            >
              Régénérer
            </button>
          </div>
          <p className="t-sub-xs mt-[10px]">
            {invite.usedCount} joueur{invite.usedCount > 1 ? 's' : ''} inscrit
            {invite.usedCount > 1 ? 's' : ''} par ce lien. Régénérer invalide l&apos;ancien.
          </p>
        </>
      )}

      {error && (
        <p className="t-sub-xs mt-2" style={{ color: 'var(--live, #FF3B30)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
