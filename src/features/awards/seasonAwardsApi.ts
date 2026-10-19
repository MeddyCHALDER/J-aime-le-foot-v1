import { supabase } from '../../lib/supabase';

export type AwardType =
  | 'ballon_dor'
  | 'puskas'
  | 'pichichi'
  | 'golden_glove'
  | 'best_young'
  | 'for_the_best';

export const AWARD_CATALOG: { type: AwardType; title: string; blurb: string }[] = [
  { type: 'ballon_dor', title: "Ballon d'Or", blurb: 'Meilleur joueur de la saison' },
  { type: 'for_the_best', title: 'For the Best', blurb: 'Le plus décisif selon le club' },
  { type: 'pichichi', title: 'Pichichi', blurb: 'Meilleur buteur' },
  { type: 'puskas', title: 'Puskás', blurb: 'Plus beau but / action' },
  { type: 'golden_glove', title: 'Golden Glove', blurb: 'Meilleur gardien' },
  { type: 'best_young', title: 'Espoir', blurb: 'Meilleur jeune' },
];

export type SeasonAward = {
  id: string;
  season_id: string;
  type: AwardType;
  title: string;
  is_open: boolean;
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

export async function openSeasonAwards(seasonId: string, playerIds: string[]) {
  const created: SeasonAward[] = [];
  for (const cat of AWARD_CATALOG) {
    const { data: award, error } = await supabase
      .from('season_awards')
      .upsert(
        {
          season_id: seasonId,
          type: cat.type,
          title: cat.title,
          is_open: true,
        },
        { onConflict: 'season_id,type' }
      )
      .select()
      .single();
    if (error) throw error;
    created.push(award as SeasonAward);

    if (playerIds.length) {
      const rows = playerIds.map((player_id) => ({
        award_id: award.id,
        player_id,
      }));
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
