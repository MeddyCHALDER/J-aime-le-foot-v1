import { supabase } from '../../lib/supabase';
import type { League, Season } from '../../types/entities';

function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function fetchLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as League[];
}

export async function fetchLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as League;
}

export async function fetchSeasonsByLeague(leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Season[];
}

export async function createLeague(name: string, createdBy: string, city?: string): Promise<League> {
  const invite_code = makeInviteCode();

  // Schéma V1 (created_by + city) ou legacy (manager_id + description)
  let league: League | null = null;
  let leagueError: { message?: string; code?: string } | null = null;

  {
    const res = await supabase
      .from('leagues')
      .insert({ name, created_by: createdBy, city: city ?? null, invite_code })
      .select()
      .single();
    league = res.data as League | null;
    leagueError = res.error;
  }

  if (leagueError) {
    const res = await supabase
      .from('leagues')
      .insert({
        name,
        manager_id: createdBy,
        description: city ?? null,
        invite_code,
      })
      .select()
      .single();
    if (res.error) throw res.error;
    league = {
      ...(res.data as object),
      created_by: createdBy,
      city: city ?? null,
    } as League;
  }

  if (!league) throw new Error('Création de ligue impossible');

  // league_members n'existe que sur le schéma V1
  await supabase.from('league_members').insert({
    league_id: league.id,
    player_id: createdBy,
    role: 'admin',
  });

  await supabase.from('seasons').insert({
    league_id: league.id,
    name: new Date().getFullYear().toString(),
    is_active: true,
  });

  return { ...league, created_by: league.created_by ?? createdBy } as League;
}

export async function joinLeagueByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_league_by_code', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}

export async function createSeason(
  leagueId: string,
  name: string,
  startDate?: string,
  endDate?: string
): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      league_id: leagueId,
      name,
      is_active: true,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Season;
}
