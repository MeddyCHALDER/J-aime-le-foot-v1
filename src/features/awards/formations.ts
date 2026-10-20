/** Formats d'équipe type proposés et leurs formations (gardien en plus). */
export const LINEUP_FORMATS: Array<{ size: number; label: string; formations: string[] }> = [
  { size: 11, label: '11 type', formations: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'] },
  { size: 9, label: '9 type', formations: ['3-3-2', '3-4-1', '4-3-1'] },
  { size: 8, label: '8 type', formations: ['3-3-1', '3-2-2', '2-3-2'] },
  { size: 7, label: '7 type', formations: ['3-2-1', '2-3-1'] },
  { size: 5, label: '5 type', formations: ['2-1-1', '1-2-1'] },
];

export function formatOf(size: number) {
  return LINEUP_FORMATS.find((f) => f.size === size) ?? LINEUP_FORMATS[0];
}

export interface PitchSlot {
  /** Clé stockée en base : 'GK' ou 'ligne-index' (ex. '0-2') */
  key: string;
  /** Poste affiché */
  label: string;
  /** Position sur le terrain, en % (0 = gauche / haut) */
  x: number;
  y: number;
}

/**
 * Postes d'une formation, de la défense à l'attaque.
 * '4-3-3' → GB, 4 DEF, 3 MIL, 3 ATT, placés en lignes sur un demi-terrain vertical.
 */
export function formationSlots(formation: string): PitchSlot[] {
  const lines = formation.split('-').map((n) => Math.max(1, Number(n) || 1));
  const slots: PitchSlot[] = [{ key: 'GK', label: 'GB', x: 50, y: 86 }];
  const count = lines.length;
  lines.forEach((n, li) => {
    // Défense en bas, attaque en haut
    const y = count === 1 ? 45 : 72 - (li * (72 - 16)) / (count - 1);
    const label = li === 0 ? 'DEF' : li === count - 1 ? 'ATT' : 'MIL';
    for (let i = 0; i < n; i++) {
      // Lignes à 1 joueur au centre ; sinon réparties sur la largeur
      const x = n === 1 ? 50 : 14 + (i * 72) / (n - 1);
      slots.push({ key: `${li}-${i}`, label, x, y });
    }
  });
  return slots;
}

/** Nombre de joueurs d'une formation, gardien compris. */
export function formationSize(formation: string) {
  return formationSlots(formation).length;
}
