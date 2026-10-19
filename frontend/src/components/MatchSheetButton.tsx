'use client'

// Export de la feuille de match en PNG, une fois l'effectif au complet.
// Les noms sont groupés par ligne, comme sur une compo publiée par un club.

import { useState } from 'react'
import { LINES, lineOf } from '@/lib/format'
import {
  downloadBlob,
  renderMatchSheet,
  type SheetGroup,
  type SheetVariant,
} from '@/lib/match-sheet'
import type { ClubMatch } from '@/lib/types'

const VARIANTS: { id: SheetVariant; label: string }[] = [
  { id: 'list', label: 'Liste' },
  { id: 'pitch', label: 'Terrain' },
]

interface Props {
  match: ClubMatch
  clubName: string
  /** Nom de la compétition ; à défaut, le match est un intra-club. */
  competition?: string | null
  season: string
  className?: string
}

export default function MatchSheetButton({
  match,
  clubName,
  competition,
  season,
  className = '',
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<SheetVariant>('list')

  const registrations = match.registrations ?? []
  const capacity = match.maxPlayers ?? 16
  const full = registrations.length >= capacity

  // L'export n'a de sens qu'une fois la liste arrêtée.
  if (!full) return null

  async function exportSheet() {
    setBusy(true)
    setError(null)
    try {
      const groups: SheetGroup[] = LINES.map((label) => ({
        label,
        names: registrations
          .filter((r) => lineOf(r.playerProfile?.position) === label)
          .map((r) => (r.playerProfile?.lastName ?? '').toUpperCase())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'fr')),
      }))

      const date = new Date(match.matchDate)
      const dateLabel = `${new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      }).format(date)} · ${new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)}`

      const blob = await renderMatchSheet(
        {
          club: clubName,
          competition: competition || 'Match intra-club',
          dateLabel,
          season,
          groups,
        },
        variant
      )

      const slug = clubName
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      downloadBlob(blob, `compo-${slug}-${date.toISOString().slice(0, 10)}.png`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <div className="seg mb-[10px]">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="seg-btn"
            data-on={variant === v.id}
            onClick={() => setVariant(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={exportSheet}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(198,255,0,.4)] bg-[rgba(198,255,0,.10)] text-[14px] font-bold text-lime"
        style={{ height: 50, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Génération…' : 'Exporter la compo en PNG'}
      </button>
      <p className="mt-[10px] text-center text-[12px] leading-[1.4] text-txt3">
        {error ?? `Effectif au complet — ${registrations.length} joueurs.`}
      </p>
    </div>
  )
}
