'use client'

// Page d'atterrissage d'un lien d'invitation.
// Deux cas : visiteur sans compte, qu'on envoie vers l'onboarding avec le jeton
// en poche ; joueur déjà connecté, qu'on rattache tout de suite au club.

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { clearInvite, storeInvite } from '@/lib/invite'
import { useSession } from '@/lib/session'
import type { Team } from '@/lib/types'

type State =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; team: Team }
  | { kind: 'joined'; team: Team }

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { token, profile, refresh } = useSession()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [joining, setJoining] = useState(false)

  const inviteToken = typeof params?.token === 'string' ? params.token : params?.token?.[0]

  useEffect(() => {
    if (!inviteToken) return
    let cancelled = false
    api.teams
      .inviteInfo(inviteToken)
      .then(({ team }) => {
        if (cancelled) return
        // Gardé pour la fin de l'onboarding, où le rattachement devient possible.
        storeInvite(inviteToken)
        setState({ kind: 'ready', team })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        clearInvite()
        setState({
          kind: 'invalid',
          message: err instanceof Error ? err.message : "Cette invitation n'est plus valable",
        })
      })
    return () => {
      cancelled = true
    }
  }, [inviteToken])

  const join = useCallback(async () => {
    if (!inviteToken || state.kind !== 'ready') return

    // Pas encore de fiche joueur : l'onboarding la crée puis consomme le jeton.
    if (!token || !profile) {
      router.push('/onboarding')
      return
    }

    setJoining(true)
    try {
      const { team } = await api.teams.acceptInvite(inviteToken, token)
      clearInvite()
      await refresh()
      setState({ kind: 'joined', team })
    } catch (err) {
      setState({
        kind: 'invalid',
        message: err instanceof Error ? err.message : 'Le rattachement a échoué',
      })
    } finally {
      setJoining(false)
    }
  }, [inviteToken, state, token, profile, router, refresh])

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      {state.kind === 'loading' && <p className="t-sub text-center">Vérification du lien…</p>}

      {state.kind === 'invalid' && (
        <div className="text-center">
          <h1 className="t-title">Invitation invalide</h1>
          <p className="t-body mt-3" style={{ color: 'var(--txt2)' }}>
            {state.message} Demande un nouveau lien à ton club.
          </p>
        </div>
      )}

      {state.kind === 'ready' && (
        <div>
          <div className="t-field" style={{ color: 'var(--lime)' }}>
            Tu es invité
          </div>
          <h1 className="t-num mt-3" style={{ fontSize: 34, lineHeight: 1.02 }}>
            Rejoins
            <br />
            {state.team.name}
          </h1>
          <p className="t-body mt-3" style={{ color: 'var(--txt2)' }}>
            {token && profile
              ? 'Un geste et tu fais partie de l’effectif : tu pourras t’inscrire aux matchs.'
              : 'Crée ta fiche joueur en deux minutes, et tu entres directement dans l’effectif.'}
          </p>
          <button
            type="button"
            onClick={join}
            disabled={joining}
            className="t-num mt-8 h-[54px] w-full rounded-[14px] bg-lime text-ink disabled:opacity-60"
            style={{ fontSize: 17, boxShadow: '0 10px 26px rgba(198,255,0,.22)' }}
          >
            {joining ? '…' : token && profile ? 'Rejoindre le club' : 'Créer ma fiche'}
          </button>
        </div>
      )}

      {state.kind === 'joined' && (
        <div className="text-center">
          <h1 className="t-title">Bienvenue au {state.team.name}</h1>
          <p className="t-body mt-3" style={{ color: 'var(--txt2)' }}>
            Tu fais partie de l’effectif. Tu peux t’inscrire aux prochains matchs.
          </p>
          <button
            type="button"
            onClick={() => router.push('/club-matches')}
            className="t-num mt-8 h-[54px] w-full rounded-[14px] bg-lime text-ink"
            style={{ fontSize: 17 }}
          >
            Voir les matchs
          </button>
        </div>
      )}
    </div>
  )
}
