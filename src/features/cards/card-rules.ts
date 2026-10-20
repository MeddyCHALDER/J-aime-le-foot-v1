/**
 * Règles carte joueur — portées depuis J-aime-le-foot (Next).
 * Ce qui se passe sur le terrain nourrit la carte (note + stats).
 */

export type StatBlock = {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
};

export type PlayerCardStats = StatBlock & { overallRating: number };

const BASE: Record<string, StatBlock> = {
  Gardien: { pace: 55, shooting: 35, passing: 55, dribbling: 45, defending: 70, physical: 68 },
  Défenseur: { pace: 62, shooting: 45, passing: 62, dribbling: 55, defending: 80, physical: 78 },
  Latéral: { pace: 78, shooting: 52, passing: 68, dribbling: 68, defending: 72, physical: 70 },
  Milieu: { pace: 68, shooting: 65, passing: 78, dribbling: 72, defending: 68, physical: 70 },
  MOC: { pace: 72, shooting: 76, passing: 78, dribbling: 79, defending: 48, physical: 62 },
  Ailier: { pace: 84, shooting: 72, passing: 70, dribbling: 82, defending: 42, physical: 60 },
  Attaquant: { pace: 78, shooting: 84, passing: 64, dribbling: 74, defending: 38, physical: 72 },
};

const WEIGHTS: Record<string, StatBlock> = {
  Gardien: { pace: 0.5, shooting: 0.2, passing: 0.8, dribbling: 0.4, defending: 2.6, physical: 1.5 },
  Défenseur: { pace: 1, shooting: 0.4, passing: 1, dribbling: 0.6, defending: 2.4, physical: 1.6 },
  Latéral: { pace: 1.6, shooting: 0.6, passing: 1.2, dribbling: 1.1, defending: 1.6, physical: 1.2 },
  Milieu: { pace: 1, shooting: 1, passing: 1.8, dribbling: 1.4, defending: 1.2, physical: 1.1 },
  MOC: { pace: 1.1, shooting: 1.5, passing: 1.7, dribbling: 1.7, defending: 0.4, physical: 0.8 },
  Ailier: { pace: 1.8, shooting: 1.3, passing: 1.1, dribbling: 1.8, defending: 0.3, physical: 0.7 },
  Attaquant: { pace: 1.3, shooting: 2.2, passing: 0.8, dribbling: 1.2, defending: 0.2, physical: 1.1 },
};

const FIELDS: (keyof StatBlock)[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
];

export type EventType =
  | 'But'
  | 'Passe déc.'
  | 'Arrêt décisif'
  | 'Carton jaune'
  | 'Carton rouge'
  | 'Remplacement';

export const EVENT_TYPES: EventType[] = [
  'But',
  'Passe déc.',
  'Arrêt décisif',
  'Carton jaune',
  'Carton rouge',
  'Remplacement',
];

const POSITIVE: EventType[] = ['But', 'Passe déc.', 'Arrêt décisif'];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function baseStats(position: string | null | undefined): StatBlock {
  return { ...(BASE[position ?? ''] ?? BASE.Milieu) };
}

export function overallFrom(stats: StatBlock, position: string | null | undefined): number {
  const w = WEIGHTS[position ?? ''] ?? WEIGHTS.Milieu;
  const total = FIELDS.reduce((sum, f) => sum + stats[f] * w[f], 0);
  const weight = FIELDS.reduce((sum, f) => sum + w[f], 0);
  return clamp(Math.round(total / weight), 1, 99);
}

/** Note de départ de tout nouveau joueur (choix de la ligue : tout le monde démarre à 85). */
export const STARTING_OVERALL = 85;

export function startingCard(position: string | null | undefined): PlayerCardStats {
  // Les stats internes dépendent du poste ; la note affichée démarre à 85 pour tous.
  const stats = baseStats(position);
  return { ...stats, overallRating: STARTING_OVERALL };
}

export function autoRating(events: EventType[]): number {
  const goals = events.filter((t) => t === 'But').length;
  const assists = events.filter((t) => t === 'Passe déc.').length;
  const cards = events.filter((t) => t.startsWith('Carton')).length;
  return clamp(6 + goals * 1.5 + assists - cards * 0.5, 1, 10);
}

export function impactDelta(events: EventType[]): number {
  const gains = events.filter((t) => POSITIVE.includes(t)).length;
  const malus = events.filter((t) => t.startsWith('Carton')).length;
  return gains - malus;
}

export function cardAfterMatch(card: PlayerCardStats, events: EventType[]): PlayerCardStats {
  const stats: StatBlock = {
    pace: card.pace,
    shooting: card.shooting,
    passing: card.passing,
    dribbling: card.dribbling,
    defending: card.defending,
    physical: card.physical,
  };

  for (const type of events) {
    if (type === 'But') stats.shooting = clamp(stats.shooting + 1, 1, 99);
    else if (type === 'Passe déc.') stats.passing = clamp(stats.passing + 1, 1, 99);
    else if (type === 'Arrêt décisif') stats.defending = clamp(stats.defending + 1, 1, 99);
    else if (type === 'Carton rouge') stats.physical = clamp(stats.physical - 1, 1, 99);
  }

  return {
    ...stats,
    overallRating: clamp(card.overallRating + impactDelta(events), 1, 99),
  };
}
