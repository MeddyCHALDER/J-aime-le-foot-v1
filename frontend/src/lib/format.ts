// Helpers d'affichage partagés par les écrans.

import type { PlayerProfile, UserSummary } from './types'

export function fullName(p?: Pick<PlayerProfile, 'firstName' | 'lastName'> | null): string {
  if (!p) return ''
  return `${p.firstName} ${p.lastName}`.trim()
}

/**
 * Nom affiché d'un utilisateur. On préfère toujours sa fiche joueur — c'est
 * elle que le club connaît — et on retombe sur le pseudo puis sur l'email
 * quand la fiche n'est pas jointe à la réponse.
 */
export function displayName(user?: UserSummary | null): string {
  if (!user) return 'Joueur'
  if (user.playerProfile) return fullName(user.playerProfile)
  return user.username || user.email?.split('@')[0] || 'Joueur'
}

/** « Sofiane Bakkali » → « SB ». Deux lettres maximum, comme dans le prototype. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** « Sofiane Bakkali » → « Sofiane B. » pour le podium. */
export function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return name
  return `${parts[0]} ${parts[1][0]}.`
}

/** Les six stats de la carte, dans l'ordre du prototype. */
/** Postes proposés à l'onboarding — la valeur stockée côté Prisma est la même chaîne. */
export const POSITIONS = [
  'Gardien',
  'Défenseur',
  'Latéral',
  'Milieu',
  'MOC',
  'Ailier',
  'Attaquant',
] as const

export const FEET = ['Gauche', 'Droit', 'Les deux'] as const

/** Abréviation affichée sur la carte collector. */
export function positionShort(position: string | null | undefined): string {
  if (!position) return '—'
  const map: Record<string, string> = {
    Gardien: 'G',
    Défenseur: 'DC',
    Latéral: 'LAT',
    Milieu: 'MC',
    MOC: 'MOC',
    Ailier: 'AIL',
    Attaquant: 'ATT',
  }
  return map[position] ?? position.slice(0, 3).toUpperCase()
}

/** Lignes de jeu, dans l'ordre où on les présente. */
export const LINES = ['Gardiens', 'Défense', 'Milieu', 'Attaque'] as const
export type Line = (typeof LINES)[number]

/** Regroupement des postes en lignes — filtres d'effectif et feuille de match. */
export function lineOf(position: string | null | undefined): Line {
  switch (position) {
    case 'Gardien':
      return 'Gardiens'
    case 'Défenseur':
    case 'Latéral':
      return 'Défense'
    case 'Milieu':
    case 'MOC':
      return 'Milieu'
    case 'Ailier':
    case 'Attaquant':
      return 'Attaque'
    default:
      // Poste non renseigné : on le range au milieu plutôt que de le perdre.
      return 'Milieu'
  }
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const LONG_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
})

/** « 04 » / « sept » pour la pastille date des prochains rendez-vous. */
export function dayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  const parts = DATE_FMT.formatToParts(d)
  return {
    day: parts.find((p) => p.type === 'day')?.value ?? '--',
    month: (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', ''),
  }
}

export function timeOf(iso: string): string {
  return TIME_FMT.format(new Date(iso))
}

export function longDate(iso: string): string {
  return LONG_FMT.format(new Date(iso))
}

/** « il y a 2 h », « hier », « lun. » — la ligne meta des posts du feed. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  if (d < 7) return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(new Date(iso))
  return DATE_FMT.format(new Date(iso))
}

/** Saison sportive : de juillet à juin. « 25/26 ». */
export function currentSeason(now = new Date()): string {
  const y = now.getFullYear()
  const start = now.getMonth() >= 6 ? y : y - 1
  return `${String(start).slice(2)}/${String(start + 1).slice(2)}`
}

/** Hachurage de remplacement, en attendant les vraies vidéos et photos. */
export const STRIPE_HUES = ['#1a2114', '#141a21', '#211a14'] as const

export function stripeStyle(index: number, band = 16): React.CSSProperties {
  const hue = STRIPE_HUES[index % STRIPE_HUES.length]
  return {
    background: `repeating-linear-gradient(122deg, ${hue} 0 ${band}px, rgba(255,255,255,.05) ${band}px ${band * 2}px)`,
  }
}
