/**
 * Postes de jeu. Le poste du profil est un texte libre (« BU », « MC », « Défenseur »…) :
 * positionShort le ramène à un code, la même règle que position_code() côté base
 * (migration 010), qui s'en sert pour refuser un vote hors poste.
 */

export type PositionCode = 'GK' | 'CB' | 'FB' | 'CM' | 'CAM' | 'W' | 'ST';

export const POSITIONS: { code: PositionCode; label: string; plural: string }[] = [
  { code: 'GK', label: 'Gardien', plural: 'Gardiens' },
  { code: 'CB', label: 'Défenseur', plural: 'Défenseurs' },
  { code: 'FB', label: 'Latéral', plural: 'Latéraux' },
  { code: 'CM', label: 'Milieu', plural: 'Milieux' },
  { code: 'CAM', label: 'Milieu offensif', plural: 'Milieux offensifs' },
  { code: 'W', label: 'Ailier', plural: 'Ailiers' },
  { code: 'ST', label: 'Attaquant', plural: 'Attaquants' },
];

/** Toute modification doit être reportée dans position_code() (migration 010). */
export function positionShort(position?: string | null): string {
  if (!position) return '—';
  const p = position.toLowerCase();
  if (p.includes('gard')) return 'GK';
  if (p.includes('déf') || p.includes('def') || p === 'dc') return 'CB';
  if (p.includes('lat')) return 'FB';
  if (p.includes('moc') || p.includes('meneur')) return 'CAM';
  if (p.includes('ail')) return 'W';
  if (p.includes('att') || p.includes('bu')) return 'ST';
  if (p.includes('mil') || p.includes('mc')) return 'CM';
  return position.slice(0, 3).toUpperCase();
}

/** Un trophée sans poste est ouvert à tous ; sinon le joueur doit en avoir un des postes. */
export function isEligible(positions: readonly string[] | null | undefined, playerPosition?: string | null) {
  if (!positions || positions.length === 0) return true;
  if (!playerPosition) return false;
  return positions.includes(positionShort(playerPosition));
}

/** « Gardiens », « Défenseurs et Latéraux », « Défenseurs, Latéraux et Milieux ». */
export function positionsLabel(positions: readonly string[] | null | undefined): string | null {
  if (!positions || positions.length === 0) return null;
  const names = POSITIONS.filter((p) => positions.includes(p.code)).map((p) => p.plural);
  if (names.length <= 1) return names[0] ?? null;
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}
