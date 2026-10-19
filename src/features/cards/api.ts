import { supabase } from '../../lib/supabase';
import { startingCard, type PlayerCardStats } from './card-rules';

export type PlayerCardRow = {
  player_id: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  updated_at?: string;
};

function toStats(row: PlayerCardRow): PlayerCardStats {
  return {
    overallRating: row.overall,
    pace: row.pace,
    shooting: row.shooting,
    passing: row.passing,
    dribbling: row.dribbling,
    defending: row.defending,
    physical: row.physical,
  };
}

export async function fetchPlayerCard(playerId: string): Promise<PlayerCardStats | null> {
  const { data, error } = await supabase
    .from('player_cards')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toStats(data as PlayerCardRow);
}

/** Crée la carte de départ si absente (poste → stats). */
export async function ensurePlayerCard(
  playerId: string,
  position?: string | null
): Promise<PlayerCardStats> {
  const existing = await fetchPlayerCard(playerId);
  if (existing) return existing;

  const start = startingCard(position);
  const { data, error } = await supabase
    .from('player_cards')
    .upsert({
      player_id: playerId,
      overall: start.overallRating,
      pace: start.pace,
      shooting: start.shooting,
      passing: start.passing,
      dribbling: start.dribbling,
      defending: start.defending,
      physical: start.physical,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return toStats(data as PlayerCardRow);
}

export async function applyMatchEventsToCards(matchId: string) {
  const { error } = await supabase.rpc('apply_card_from_match_events', {
    p_match_id: matchId,
  });
  if (error) throw error;
}
