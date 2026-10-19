import type { Match, MatchEvent, LeagueMemberWithProfile, PlayerStandingRow, PlayerStats } from '../../types/entities';

/** Points joueur: victoire +3, nul +1, défaite +0; but +1, passe +1, MVP +2; jaune -1, rouge -3 */
function playerPointsFromEvents(
  playerId: string,
  events: MatchEvent[],
  wins: number,
  draws: number,
  losses: number
): number {
  let pts = wins * 3 + draws * 1 + losses * 0;
  const playerEvents = events.filter((e) => e.player_id === playerId);
  for (const e of playerEvents) {
    if (e.type === 'goal') pts += 1;
    if (e.type === 'assist') pts += 1;
    if (e.type === 'mvp') pts += 2;
    if (e.type === 'yellow') pts -= 1;
    if (e.type === 'red') pts -= 3;
  }
  return pts;
}

/** Détermine si le joueur a gagné / nul / perdu un match (côté home ou away) */
function getMatchResult(
  match: Match,
  teamSide: 'home' | 'away'
): 'win' | 'draw' | 'loss' {
  if (match.status !== 'played') return 'draw';
  const home = match.home_score;
  const away = match.away_score;
  if (teamSide === 'home') {
    if (home > away) return 'win';
    if (home < away) return 'loss';
    return 'draw';
  }
  if (away > home) return 'win';
  if (away < home) return 'loss';
  return 'draw';
}

/** Construit les stats par joueur pour un match (côté home ou away) à partir des events */
function getPlayerMatchStats(
  playerId: string,
  events: MatchEvent[],
  teamSide: 'home' | 'away'
) {
  const playerEvents = events.filter((e) => e.player_id === playerId && e.team_side === teamSide);
  return {
    goals: playerEvents.filter((e) => e.type === 'goal').length,
    assists: playerEvents.filter((e) => e.type === 'assist').length,
    yellow: playerEvents.filter((e) => e.type === 'yellow').length,
    red: playerEvents.filter((e) => e.type === 'red').length,
    mvp: playerEvents.filter((e) => e.type === 'mvp').length,
  };
}

/** Map: match_id -> { homePlayerIds, awayPlayerIds } (à partir de match_teams + match_team_players) */
export type MatchSidesMap = Map<
  string,
  { home: string[]; away: string[] }
>;

/**
 * Classement PAR JOUEUR (points).
 * members = league_members avec profiles.
 * matches = matchs de la saison (status played pour wins/draws/losses).
 * events = tous les events des matchs de la saison.
 * matchSides = pour chaque match, quels joueurs étaient home/away (pour attribuer W/D/L).
 */
export function computePlayerStandings(
  members: LeagueMemberWithProfile[],
  matches: Match[],
  events: MatchEvent[],
  matchSides: MatchSidesMap
): PlayerStandingRow[] {
  const playedMatches = matches.filter((m) => m.status === 'played');
  const rows: PlayerStandingRow[] = members.map((m) => {
    const playerId = m.player_id;
    const profile = m.profile;
    const name = profile?.display_name ?? 'Inconnu';
    const avatarUrl = profile?.avatar_url ?? null;

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goals = 0;
    let assists = 0;
    let mvp = 0;
    let yellow = 0;
    let red = 0;

    for (const match of playedMatches) {
      const sides = matchSides.get(match.id);
      if (!sides) continue;
      const isHome = sides.home.includes(playerId);
      const isAway = sides.away.includes(playerId);
      if (!isHome && !isAway) continue;

      const side: 'home' | 'away' = isHome ? 'home' : 'away';
      const result = getMatchResult(match, side);
      if (result === 'win') wins += 1;
      else if (result === 'draw') draws += 1;
      else losses += 1;

      const s = getPlayerMatchStats(playerId, events, side);
      goals += s.goals;
      assists += s.assists;
      yellow += s.yellow;
      red += s.red;
      mvp += s.mvp;
    }

    const played = wins + draws + losses;
    const points = playerPointsFromEvents(playerId, events, wins, draws, losses);

    return {
      player_id: playerId,
      player_name: name,
      avatar_url: avatarUrl,
      played,
      wins,
      draws,
      losses,
      points,
      goals,
      assists,
      mvp,
      yellow,
      red,
    };
  });

  return rows.sort((a, b) => b.points - a.points);
}

/**
 * Ballon d'Or score: buts*4 + passes*3 + mvp*5 + victoires*1 - jaunes*1 - rouges*3
 * FUT rating (1-99): base 50 + (buts/match)*20 + (passes/match)*15 + (%victoires)*20 + (mvp/match)*10 - (cartons/match)*10, clamp 1-99
 */
export function computePlayerStats(
  members: LeagueMemberWithProfile[],
  matches: Match[],
  events: MatchEvent[],
  matchSides: MatchSidesMap
): PlayerStats[] {
  const playedMatches = matches.filter((m) => m.status === 'played');

  return members.map((m) => {
    const playerId = m.player_id;
    const profile = m.profile;
    const name = profile?.display_name ?? 'Inconnu';
    const avatarUrl = profile?.avatar_url ?? null;
    const preferredPosition = profile?.preferred_position ?? null;

    let wins = 0;
    let draws = 0;
    let goals = 0;
    let assists = 0;
    let mvp = 0;
    let yellow = 0;
    let red = 0;
    let matchesPlayed = 0;

    for (const match of playedMatches) {
      const sides = matchSides.get(match.id);
      if (!sides) continue;
      const isHome = sides.home.includes(playerId);
      const isAway = sides.away.includes(playerId);
      if (!isHome && !isAway) continue;

      matchesPlayed += 1;
      const side: 'home' | 'away' = isHome ? 'home' : 'away';
      const res = getMatchResult(match, side);
      if (res === 'win') wins += 1;
      else if (res === 'draw') draws += 1;
      const s = getPlayerMatchStats(playerId, events, side);
      goals += s.goals;
      assists += s.assists;
      mvp += s.mvp;
      yellow += s.yellow;
      red += s.red;
    }

    const ballon_dor_score =
      goals * 4 + assists * 3 + mvp * 5 + wins * 1 - yellow * 1 - red * 3;

    const cartonsPerMatch = matchesPlayed > 0 ? (yellow + red) / matchesPlayed : 0;
    const goalsPerMatch = matchesPlayed > 0 ? goals / matchesPlayed : 0;
    const assistsPerMatch = matchesPlayed > 0 ? assists / matchesPlayed : 0;
    const mvpPerMatch = matchesPlayed > 0 ? mvp / matchesPlayed : 0;
    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

    let fut_rating =
      50 +
      goalsPerMatch * 20 +
      assistsPerMatch * 15 +
      winRate * 20 +
      mvpPerMatch * 10 -
      cartonsPerMatch * 10;
    fut_rating = Math.round(Math.min(99, Math.max(1, fut_rating)));

    const pts = wins * 3 + draws * 1 + goals + assists + mvp * 2 - yellow - red * 3;

    return {
      player_id: playerId,
      player_name: name,
      avatar_url: avatarUrl,
      preferred_position: preferredPosition,
      matches: matchesPlayed,
      goals,
      assists,
      yellow,
      red,
      mvp,
      wins,
      points: pts,
      ballon_dor_score,
      fut_rating,
    };
  });
}

/** Construit MatchSidesMap à partir des match_teams + match_team_players (données brutes) */
export function buildMatchSidesMap(
  matchTeams: Array<{ id: string; match_id: string; side: string }>,
  teamPlayers: Array<{ match_team_id: string; player_id: string }>
): MatchSidesMap {
  const map: MatchSidesMap = new Map();
  for (const mt of matchTeams) {
    if (!map.has(mt.match_id)) map.set(mt.match_id, { home: [], away: [] });
    const entry = map.get(mt.match_id)!;
    const players = teamPlayers.filter((p) => p.match_team_id === mt.id).map((p) => p.player_id);
    if (mt.side === 'home') entry.home = players;
    else entry.away = players;
  }
  return map;
}
