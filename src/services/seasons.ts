import { supabase } from '../lib/supabase';
import type { Season } from '../types/database';

export async function fetchSeasonsByLeague(leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data as Season[];
}

export async function fetchSeasonById(id: string): Promise<Season | null> {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Season;
}

export async function createSeason(leagueId: string, name: string, startDate?: string, endDate?: string) {
  const { data, error } = await supabase
    .from('seasons')
    .insert({ league_id: leagueId, name, start_date: startDate ?? null, end_date: endDate ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Season;
}

export async function updateSeason(
  id: string,
  updates: Partial<Pick<Season, 'name' | 'start_date' | 'end_date'>>
) {
  const { data, error } = await supabase.from('seasons').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Season;
}

export async function deleteSeason(id: string) {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}
