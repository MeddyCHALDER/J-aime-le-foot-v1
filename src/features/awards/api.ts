import { supabase } from '../../lib/supabase';
import type { MatchEvent, Player } from '../../types/entities';

export async function fetchPlayersBySeason(seasonId: string): Promise<Player[]> {
  const { data: teams } = await supabase.from('teams').select('id').eq('season_id', seasonId);
  if (!teams?.length) return [];
  const ids = teams.map((t: { id: string }) => t.id);
  const { data, error } = await supabase.from('players').select('*').in('team_id', ids).order('number');
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function fetchEventsBySeason(seasonId: string): Promise<MatchEvent[]> {
  const { data: matches } = await supabase.from('matches').select('id').eq('season_id', seasonId);
  if (!matches?.length) return [];
  const events: MatchEvent[] = [];
  for (const m of matches) {
    const { data } = await supabase.from('match_events').select('*').eq('match_id', m.id);
    events.push(...((data ?? []) as MatchEvent[]));
  }
  return events;
}
