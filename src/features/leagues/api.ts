import { supabase } from '../../lib/supabase';
import type { League, Season } from '../../types/entities';

function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function normalizeLeague(row: Record<string, unknown>): League {
  return {
    id: String(row.id),
    name: String(row.name),
    city: (row.city as string | null) ?? (row.description as string | null) ?? null,
    created_by: String(row.created_by ?? row.manager_id ?? ''),
    invite_code: (row.invite_code as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeSeason(row: Record<string, unknown>): Season {
  return {
    id: String(row.id),
    league_id: String(row.league_id),
    name: String(row.name),
    is_active: Boolean(row.is_active ?? true),
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** Ligues dont l'utilisateur est membre (toutes si league_members n'existe pas encore). */
export async function fetchLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('name');
  if (error) throw error;
  const leagues = (data ?? []).map((r) => normalizeLeague(r as Record<string, unknown>));

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return leagues;
  const { data: mine, error: memErr } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('player_id', uid);
  // Table absente (migration 006 non passée) : on garde l'ancien comportement.
  if (memErr) return leagues;
  const ids = new Set((mine ?? []).map((m) => String(m.league_id)));
  return leagues.filter((l) => ids.has(l.id) || l.created_by === uid);
}

export async function fetchLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return normalizeLeague(data as Record<string, unknown>);
}

export async function fetchSeasonsByLeague(leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalizeSeason(r as Record<string, unknown>));
}

export async function createLeague(name: string, createdBy: string, city?: string): Promise<League> {
  const invite_code = makeInviteCode();

  let league: League | null = null;
  let leagueError: { message?: string } | null = null;

  {
    const res = await supabase
      .from('leagues')
      .insert({ name, created_by: createdBy, city: city ?? null, invite_code })
      .select()
      .single();
    if (res.data) league = normalizeLeague(res.data as Record<string, unknown>);
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
    league = normalizeLeague({
      ...(res.data as object),
      created_by: createdBy,
      city: city ?? null,
    } as Record<string, unknown>);
  }

  if (!league) throw new Error('Création de ligue impossible');

  await supabase.from('league_members').insert({
    league_id: league.id,
    player_id: createdBy,
    role: 'admin',
  });

  // Saison : avec ou sans is_active selon le schéma
  {
    const withActive = await supabase.from('seasons').insert({
      league_id: league.id,
      name: new Date().getFullYear().toString(),
      is_active: true,
    });
    if (withActive.error) {
      await supabase.from('seasons').insert({
        league_id: league.id,
        name: new Date().getFullYear().toString(),
      });
    }
  }

  return league;
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
  const withActive = await supabase
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

  if (!withActive.error && withActive.data) {
    return normalizeSeason(withActive.data as Record<string, unknown>);
  }

  const res = await supabase
    .from('seasons')
    .insert({
      league_id: leagueId,
      name,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
    })
    .select()
    .single();
  if (res.error) throw res.error;
  return normalizeSeason(res.data as Record<string, unknown>);
}
