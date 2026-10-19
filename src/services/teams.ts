import { supabase } from '../lib/supabase';
import type { Team } from '../types/database';

export async function fetchTeamsBySeason(seasonId: string): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').eq('season_id', seasonId).order('name');
  if (error) throw error;
  return data as Team[];
}

export async function fetchTeamById(id: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Team;
}

export async function createTeam(seasonId: string, name: string, logoUrl?: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ season_id: seasonId, name, logo_url: logoUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Team;
}

export async function updateTeam(id: string, updates: Partial<Pick<Team, 'name' | 'logo_url'>>) {
  const { data, error } = await supabase.from('teams').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Team;
}

export async function deleteTeam(id: string) {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}
