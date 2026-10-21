import { supabase } from '../../lib/supabase';
import type { PositionCode } from '../cards/positions';

export type AwardType =
  | 'ballon_dor'
  | 'puskas'
  | 'pichichi'
  | 'golden_glove'
  | 'best_young'
  | 'for_the_best';

export const AWARD_CATALOG: {
  type: AwardType;
  title: string;
  blurb: string;
  positions?: PositionCode[];
}[] = [
  { type: 'ballon_dor', title: "Ballon d'Or", blurb: 'Meilleur joueur de la saison' },
  { type: 'for_the_best', title: 'For the Best', blurb: 'Le plus décisif selon le club' },
  { type: 'pichichi', title: 'Pichichi', blurb: 'Meilleur buteur' },
  { type: 'puskas', title: 'Puskás', blurb: 'Plus beau but / action' },
  { type: 'golden_glove', title: 'Golden Glove', blurb: 'Meilleur gardien', positions: ['GK'] },
  { type: 'best_young', title: 'Espoir', blurb: 'Meilleur jeune' },
];

/**
 * Les trophées classiques n'acceptent les votes qu'à partir du vendredi 23 octobre 2026,
 * 9h (Paris). La migration 011 applique la même date à ceux déjà créés.
 */
export const CLASSIC_AWARDS_OPEN_AT = '2026-10-23T07:00:00Z';

export type SeasonAward = {
  id: string;
  season_id: string;
  /** Un des types du catalogue, ou 'custom' pour un trophée créé par l'admin (migration 008). */
  type: AwardType | 'custom' | string;
  title: string;
  description?: string | null;
  is_open: boolean;
  /** Postes qui peuvent recevoir des voix (codes de positions.ts) ; vide = tous (migration 010). */
  positions?: string[] | null;
  /** Avant cette heure, le trophée est visible mais on ne peut pas voter (migration 011). */
  opens_at?: string | null;
  created_at: string;
};

export type AwardNomination = {
  id: string;
  award_id: string;
  player_id: string;
  profile?: { display_name: string; avatar_url: string | null } | null;
  vote_count?: number;
};

export async function fetchSeasonAwards(seasonId: string): Promise<SeasonAward[]> {
  const { data, error } = await supabase
    .from('season_awards')
    .select('*')
    .eq('season_id', seasonId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as SeasonAward[];
}

/** Ajoute les trophées classiques manquants à la saison (les existants sont conservés). */
export async function openSeasonAwards(seasonId: string, playerIds: string[]) {
  const existing = await fetchSeasonAwards(seasonId);
  const created: SeasonAward[] = [];
  for (const cat of AWARD_CATALOG) {
    if (existing.some((a) => a.type === cat.type)) continue;
    const { data: award, error } = await supabase
      .from('season_awards')
      .insert({
        season_id: seasonId,
        type: cat.type,
        title: cat.title,
        is_open: true,
        ...positionsField(cat.positions),
        ...classicOpening(),
      })
      .select()
      .single();
    if (error) throw error;
    created.push(award as SeasonAward);

    if (playerIds.length) {
      const rows = playerIds.map((player_id) => ({ award_id: award.id, player_id }));
      const { error: nomErr } = await supabase.from('award_nominations').upsert(rows, {
        onConflict: 'award_id,player_id',
        ignoreDuplicates: true,
      });
      if (nomErr) throw nomErr;
    }
  }
  return created;
}

export async function fetchNominations(awardId: string): Promise<AwardNomination[]> {
  const { data, error } = await supabase
    .from('award_nominations')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('award_id', awardId);
  if (error) throw error;

  const { data: votes } = await supabase.from('award_votes').select('nomination_id').eq('award_id', awardId);
  const counts = new Map<string, number>();
  for (const v of votes ?? []) {
    counts.set(v.nomination_id, (counts.get(v.nomination_id) ?? 0) + 1);
  }

  return ((data ?? []) as AwardNomination[]).map((n) => ({
    ...n,
    vote_count: counts.get(n.id) ?? 0,
  }));
}

export async function fetchMyVote(awardId: string, voterId: string) {
  const { data, error } = await supabase
    .from('award_votes')
    .select('*')
    .eq('award_id', awardId)
    .eq('voter_id', voterId)
    .maybeSingle();
  if (error) throw error;
  return data as { nomination_id: string } | null;
}

export async function castVote(awardId: string, nominationId: string, voterId: string) {
  const { data, error } = await supabase
    .from('award_votes')
    .upsert(
      {
        award_id: awardId,
        nomination_id: nominationId,
        voter_id: voterId,
      },
      { onConflict: 'award_id,voter_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeAward(awardId: string) {
  const { error } = await supabase.from('season_awards').update({ is_open: false }).eq('id', awardId);
  if (error) throw error;
}

export async function fetchAward(awardId: string): Promise<SeasonAward | null> {
  const { data, error } = await supabase.from('season_awards').select('*').eq('id', awardId).maybeSingle();
  if (error) throw error;
  return (data as SeasonAward | null) ?? null;
}

/** Joueur choisi par l'utilisateur pour chaque trophée : { awardId: playerId }. */
export async function fetchMyVotes(awardIds: string[], voterId: string): Promise<Record<string, string>> {
  if (awardIds.length === 0) return {};
  const { data, error } = await supabase
    .from('award_votes')
    .select('award_id, nomination:award_nominations(player_id)')
    .eq('voter_id', voterId)
    .in('award_id', awardIds);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{
    award_id: string;
    nomination: { player_id: string } | { player_id: string }[] | null;
  }>) {
    const n = Array.isArray(row.nomination) ? row.nomination[0] : row.nomination;
    if (n?.player_id) out[row.award_id] = n.player_id;
  }
  return out;
}

/** Voix par joueur pour un trophée : { playerId: nombre }. */
export async function fetchAwardTally(awardId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('award_votes')
    .select('nomination:award_nominations(player_id)')
    .eq('award_id', awardId);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{
    nomination: { player_id: string } | { player_id: string }[] | null;
  }>) {
    const n = Array.isArray(row.nomination) ? row.nomination[0] : row.nomination;
    if (n?.player_id) out[n.player_id] = (out[n.player_id] ?? 0) + 1;
  }
  return out;
}

/** Vote pour n'importe quel joueur de la ligue (nomination créée à la volée, migration 006). */
export async function voteForPlayer(awardId: string, playerId: string): Promise<void> {
  const { error } = await supabase.rpc('cast_award_vote', {
    p_award_id: awardId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

/**
 * N'écrit la colonne que si des postes sont choisis : un trophée ouvert à tous
 * reste créable tant que la migration 010 n'a pas été exécutée.
 */
function positionsField(positions?: readonly string[]) {
  return positions && positions.length > 0 ? { positions: [...positions] } : {};
}

function classicOpening() {
  return Date.parse(CLASSIC_AWARDS_OPEN_AT) > Date.now() ? { opens_at: CLASSIC_AWARDS_OPEN_AT } : {};
}

/** Le vote a-t-il commencé ? (ouvert et heure d'ouverture passée) */
export function votingStarted(award: Pick<SeasonAward, 'is_open' | 'opens_at'>, now = Date.now()) {
  return award.is_open && (!award.opens_at || Date.parse(award.opens_at) <= now);
}

/** « vendredi 23 octobre à 09:00 » */
export function formatOpening(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

/** Admin : crée un trophée au nom libre (migration 008), réservé ou non à des postes. */
export async function createAward(
  seasonId: string,
  title: string,
  description?: string,
  positions: string[] = []
): Promise<SeasonAward> {
  const { data, error } = await supabase
    .from('season_awards')
    .insert({
      season_id: seasonId,
      type: 'custom',
      title: title.trim(),
      description: description?.trim() || null,
      is_open: true,
      ...positionsField(positions),
    })
    .select()
    .single();
  if (error) throw error;
  return data as SeasonAward;
}

/**
 * Admin : change les postes d'un trophée (vide = ouvert à tous). Les voix pour un
 * joueur devenu hors poste sont retirées par la base (migration 010).
 */
export async function updateAwardPositions(awardId: string, positions: string[]): Promise<void> {
  const { error, count } = await supabase
    .from('season_awards')
    .update({ positions: positions.length > 0 ? positions : null }, { count: 'exact' })
    .eq('id', awardId);
  if (error) throw error;
  if (count === 0) throw new Error('Modification refusée : seul l’admin de la ligue peut changer les postes.');
}

/** Admin : supprime un trophée et ses votes (cascade côté base). */
export async function deleteAward(awardId: string): Promise<void> {
  const { error, count } = await supabase
    .from('season_awards')
    .delete({ count: 'exact' })
    .eq('id', awardId);
  if (error) throw error;
  // RLS : une suppression refusée ne renvoie pas d'erreur, juste 0 ligne.
  if (count === 0) throw new Error('Suppression refusée : seul l’admin de la ligue peut supprimer un trophée.');
}

/** Description affichée : celle saisie par l'admin, sinon celle du catalogue. */
export function awardBlurb(award: Pick<SeasonAward, 'type' | 'description'>): string | null {
  return award.description || AWARD_CATALOG.find((c) => c.type === award.type)?.blurb || null;
}
