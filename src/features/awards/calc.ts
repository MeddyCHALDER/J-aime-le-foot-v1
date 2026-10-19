import type { Match, MatchEvent, Player, Team } from '../../types/entities';
import type { PlayerStats } from '../../types/entities';

const BALLON_WEIGHTS = {
  goals: 4,
  assists: 3,
  motm: 5,
  wins: 1,
  yellow_cards: -1,
  red_cards: -3,
};

/**
 * Ballon d'Or : buts*4 + passes*3 + motm*5 + victoires*1 - jaunes*1 - rouges*3
 */
export function computePlayerStats(
  playerId: string,
  player: Player,
  team: Team,
  matches: Match[],
  events: MatchEvent[]
): PlayerStats {
  const played = matches.filter(
    (m) => m.status === 'played' && (m.home_team_id === team.id || m.away_team_id === team.id)
  );
  const playerEvents = events.filter((e) => e.player_id === playerId);
  const goals = playerEvents.filter((e) => e.event_type === 'goal').length;
  const assists = playerEvents.filter((e) => e.event_type === 'assist').length;
  const yellow_cards = playerEvents.filter((e) => e.event_type === 'yellow_card').length;
  const red_cards = playerEvents.filter((e) => e.event_type === 'red_card').length;
  const motm = playerEvents.filter((e) => e.event_type === 'motm').length;

  let wins = 0;
  for (const m of played) {
    const isHome = m.home_team_id === team.id;
    if (isHome ? m.home_score > m.away_score : m.away_score > m.home_score) wins += 1;
  }

  const ballon_dor_score =
    goals * BALLON_WEIGHTS.goals +
    assists * BALLON_WEIGHTS.assists +
    motm * BALLON_WEIGHTS.motm +
    wins * BALLON_WEIGHTS.wins +
    yellow_cards * BALLON_WEIGHTS.yellow_cards +
    red_cards * BALLON_WEIGHTS.red_cards;

  return {
    player_id: player.id,
    player_name: player.name,
    team_name: team.name,
    matches: played.length,
    goals,
    assists,
    yellow_cards,
    red_cards,
    motm,
    wins,
    ballon_dor_score,
  };
}

export function computeAllPlayersStats(
  players: Player[],
  teams: Team[],
  matches: Match[],
  events: MatchEvent[]
): PlayerStats[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const stats: PlayerStats[] = [];
  for (const p of players) {
    const team = teamMap.get(p.team_id);
    if (!team) continue;
    stats.push(computePlayerStats(p.id, p, team, matches, events));
  }
  return stats.sort((a, b) => b.ballon_dor_score - a.ballon_dor_score);
}
