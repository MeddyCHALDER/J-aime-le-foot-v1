import { supabase } from '../lib/supabase';
import type { Player } from '../types/database';

export async function fetchPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').eq('team_id', teamId).order('number');
  if (error) throw error;
  return data as Player[];
}

export async function fetchPlayersBySeason(seasonId: string): Promise<Player[]> {
  const { data: teams } = await supabase.from('teams').select('id').eq('season_id', seasonId);
  if (!teams?.length) return [];
  const ids = teams.map((t: { id: string }) => t.id);
  const { data, error } = await supabase.from('players').select('*').in('team_id', ids).order('number');
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function fetchPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Player;
}

export async function createPlayer(teamId: string, name: string, number?: number, position?: string) {
  const { data, error } = await supabase
    .from('players')
    .insert({ team_id: teamId, name, number: number ?? null, position: position ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Player;
}

export async function updatePlayer(id: string, updates: Partial<Pick<Player, 'name' | 'number' | 'position'>>) {
  const { data, error } = await supabase.from('players').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Player;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}
