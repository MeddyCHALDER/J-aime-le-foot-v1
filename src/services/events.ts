import { supabase } from '../lib/supabase';
import type { MatchEvent, MatchEventType } from '../types/database';

export async function fetchEventsByMatch(matchId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as MatchEvent[];
}

export async function fetchEventsByMatchWithPlayer(matchId: string) {
  const { data, error } = await supabase
    .from('match_events')
    .select(
      `
      *,
      player:players(*)
    `
    )
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMatchEvent(
  matchId: string,
  playerId: string,
  teamId: string,
  eventType: MatchEventType,
  minute?: number
) {
  const { data, error } = await supabase
    .from('match_events')
    .insert({ match_id: matchId, player_id: playerId, team_id: teamId, event_type: eventType, minute: minute ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as MatchEvent;
}

export async function deleteMatchEvent(id: string) {
  const { error } = await supabase.from('match_events').delete().eq('id', id);
  if (error) throw error;
}

export async function updateMatchEvent(id: string, updates: Partial<Pick<MatchEvent, 'minute' | 'event_type'>>) {
  const { data, error } = await supabase.from('match_events').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as MatchEvent;
}

export async function fetchEventsBySeason(seasonId: string): Promise<MatchEvent[]> {
  const { data: matches } = await supabase.from('matches').select('id').eq('season_id', seasonId);
  if (!matches?.length) return [];
  const events: MatchEvent[] = [];
  for (const m of matches) {
    const { data } = await supabase.from('match_events').select('*').eq('match_id', m.id);
    events.push(...(data ?? []));
  }
  return events as MatchEvent[];
}
