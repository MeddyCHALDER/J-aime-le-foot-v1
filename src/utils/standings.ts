import type { Match, Team } from '../types/database';
import type { StandingRow } from '../types/database';

/**
 * Calcule le classement d'une saison à partir des matchs joués.
 * Points: victoire 3, nul 1, défaite 0.
 * Tri: points DESC, diff de buts DESC, buts pour DESC.
 */
export function computeStandings(
  matches: Match[],
  teams: Team[]
): StandingRow[] {
  const played = matches.filter((m) => m.status === 'played');
  const map = new Map<string, StandingRow>();

  for (const t of teams) {
    map.set(t.id, {
      team_id: t.id,
      team_name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
    });
  }

  for (const m of played) {
    const home = map.get(m.home_team_id);
    const away = map.get(m.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goals_for += m.home_score;
    home.goals_against += m.away_score;
    away.goals_for += m.away_score;
    away.goals_against += m.home_score;

    if (m.home_score > m.away_score) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.home_score < m.away_score) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of map.values()) {
    row.goal_diff = row.goals_for - row.goals_against;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    return b.goals_for - a.goals_for;
  });
}
