/** Ligne du terrain d'un poste (sert au filtrage des équipes types). */
export type PitchLine = 'GB' | 'DEF' | 'MIL' | 'ATT';

/** Postes autorisés pour un joueur : un code court, comme sur les cartes FIFA. */
export const POSITIONS: Array<{ code: string; label: string; line: PitchLine; base: string }> = [
  { code: 'GB', label: 'Gardien', line: 'GB', base: 'Gardien' },
  { code: 'DC', label: 'Défenseur central', line: 'DEF', base: 'Défenseur' },
  { code: 'DG', label: 'Latéral gauche', line: 'DEF', base: 'Latéral' },
  { code: 'DD', label: 'Latéral droit', line: 'DEF', base: 'Latéral' },
  { code: 'MDC', label: 'Milieu défensif', line: 'MIL', base: 'Milieu' },
  { code: 'MC', label: 'Milieu central', line: 'MIL', base: 'Milieu' },
  { code: 'MOC', label: 'Milieu offensif', line: 'MIL', base: 'MOC' },
  { code: 'AG', label: 'Ailier gauche', line: 'ATT', base: 'Ailier' },
  { code: 'AD', label: 'Ailier droit', line: 'ATT', base: 'Ailier' },
  { code: 'BU', label: 'Buteur', line: 'ATT', base: 'Attaquant' },
];

export const LINE_LABEL: Record<PitchLine, string> = {
  GB: 'Gardien',
  DEF: 'Défense',
  MIL: 'Milieu',
  ATT: 'Attaque',
};

function find(position: string | null | undefined) {
  if (!position) return undefined;
  const p = position.trim().toUpperCase();
  return POSITIONS.find((x) => x.code === p);
}

/** Poste reconnu ? (les anciens textes libres ne le sont pas forcément) */
export function isKnownPosition(position: string | null | undefined) {
  return !!find(position);
}

/**
 * Ligne du terrain d'un poste. Les anciens textes libres (« Milieu », « attaquant »…)
 * sont rattachés au mieux ; null si le poste est vide ou inconnu.
 */
export function lineOf(position: string | null | undefined): PitchLine | null {
  const known = find(position);
  if (known) return known.line;
  if (!position) return null;
  const p = position.toLowerCase();
  if (p.includes('gard') || p === 'gk') return 'GB';
  if (p.includes('déf') || p.includes('def') || p.includes('lat') || p === 'cb') return 'DEF';
  if (p.includes('mil') || p.includes('moc') || p === 'cm' || p === 'cam') return 'MIL';
  if (p.includes('att') || p.includes('ail') || p.includes('but') || p === 'st') return 'ATT';
  return null;
}

/** Clé des stats de départ (card-rules) pour un poste. */
export function baseKeyOf(position: string | null | undefined): string | null {
  return find(position)?.base ?? null;
}
