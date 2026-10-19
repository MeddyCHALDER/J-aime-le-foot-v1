'use client'

// Ma carte : la carte collector et l'historique des
// notes de match.
//
// Le backend ne conserve qu'une carte par joueur, mise à jour en place — il n'y
// a donc pas d'historique de note globale. L'historique affiché est reconstitué
// depuis les feuilles de match : une note par match joué, calculée avec les
// mêmes règles que la saisie admin.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import PlayerCard from '@/components/PlayerCard'
import { EmptyState, Pill, Screen, ScreenHeader, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { autoRating } from '@/lib/card-rules'
import { useClub } from '@/lib/club'
import { currentSeason } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { ClubMatchStat } from '@/lib/types'

interface HistoryPoint {
  label: string
  rating: number
}

export default function CardPage() {
  const { token, profile, card, loading: sessionLoading } = useSession()
  const { championship } = useClub()
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)


  useEffect(() => {
    if (!token || !profile) {
      setLoadingHistory(false)
      return
    }
    let cancelled = false

    async function load() {
      try {
        const mine = await api.clubMatches.mine(token!)
        const played = mine
          .filter((m) => m.status === 'COMPLETED')
          .sort((a, b) => +new Date(a.matchDate) - +new Date(b.matchDate))
          .slice(-8)

        const details = await Promise.all(
          played.map((m) => api.clubMatches.byId(m.id).catch(() => null))
        )

        const points: HistoryPoint[] = []
        details.forEach((detail, i) => {
          const line = detail?.stats?.find((s) => s.playerProfileId === profile!.id)
          if (!line) return
          points.push({ label: `J${i + 1}`, rating: ratingOf(line) })
        })

        if (!cancelled) setHistory(points)
      } catch {
        if (!cancelled) setHistory([])
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token, profile])

  if (sessionLoading) {
    return (
      <Screen>
        <ScreenHeader title="Ma carte" />
        <div className="px-4 pt-6">
          <Skeleton height={380} className="rounded-[22px]" />
        </div>
      </Screen>
    )
  }

  if (!profile) {
    return (
      <Screen>
        <ScreenHeader title="Ma carte" />
        <EmptyState
          title="Pas encore de carte"
          hint="Crée ta fiche joueur et ta carte de départ est générée à partir de ton poste."
          action={
            <Link
              href="/onboarding"
              className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
              style={{ height: 46 }}
            >
              Créer ma carte
            </Link>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      {/* La saison affichée est celle du championnat du club, pas l'année civile. */}
      <ScreenHeader
        title="Ma carte"
        right={<Pill>Saison {championship?.season ?? currentSeason()}</Pill>}
      />

      <div className="flex justify-center px-0 pb-[6px] pt-[22px]">
        <PlayerCard profile={profile} card={card} />
      </div>

      <p className="text-center text-[12px] font-medium leading-none text-txt3">
        Touche la carte pour l&apos;incliner
      </p>

      {/* Historique */}
      <div className="card-lg mx-4 mb-6 mt-[14px] p-4">
        <div className="t-section mb-[13px]">Note de match</div>

        {loadingHistory && <Skeleton height={82} />}

        {!loadingHistory && history.length === 0 && (
          <p className="text-[12.5px] leading-[1.45] text-txt2">
            Aucun match saisi pour l&apos;instant. Dès que l&apos;admin valide une feuille de match,
            ta note apparaît ici.
          </p>
        )}

        {/* Colonnes bornées en largeur : avec un seul match joué, une barre en
            `flex-1` occuperait tout le bloc et se lirait comme une erreur. */}
        {!loadingHistory && history.length > 0 && (
          <div className="flex h-[82px] items-end gap-[7px]">
            {history.map((h, i) => (
              <div
                key={h.label}
                className="flex flex-1 flex-col items-center gap-[7px]"
                style={{ maxWidth: 40 }}
              >
                <div
                  className="w-full rounded-[3px]"
                  style={{
                    // 10/10 remplit la colonne ; le dernier match est mis en avant.
                    height: `${Math.max(4, (h.rating / 10) * 60)}px`,
                    background:
                      i === history.length - 1 ? 'var(--lime)' : 'rgba(198,255,0,.28)',
                  }}
                  title={`${h.label} · ${h.rating.toFixed(1)}/10`}
                />
                <span className="text-[10px] font-medium leading-none text-txt3">{h.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}

/** Même barème que la feuille de match admin : 6 de base, buts et passes en plus. */
function ratingOf(line: ClubMatchStat): number {
  const events: Parameters<typeof autoRating>[0] = []
  for (let i = 0; i < line.goals; i++) events.push('But')
  for (let i = 0; i < line.assists; i++) events.push('Passe déc.')
  for (let i = 0; i < line.yellowCards; i++) events.push('Carton jaune')
  for (let i = 0; i < line.redCards; i++) events.push('Carton rouge')
  return autoRating(events)
}
