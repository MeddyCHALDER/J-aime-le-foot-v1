export type MatchEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm';
export type MatchStatus = 'scheduled' | 'played' | 'postponed' | 'cancelled';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface League {
  id: string;
  name: string;
  manager_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueWithFollow extends League {
  is_following?: boolean;
}

export interface Season {
  id: string;
  league_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  season_id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  home_score: number;
  away_score: number;
  status: MatchStatus;
  stream_url: string | null;
  replay_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: MatchEventType;
  minute: number | null;
  created_at: string;
}

export interface LeagueFollow {
  id: string;
  user_id: string;
  league_id: string;
  created_at: string;
}

// Avec relations pour l'affichage
export interface MatchWithTeams extends Match {
  home_team?: Team;
  away_team?: Team;
  events?: MatchEventWithPlayer[];
}

export interface MatchEventWithPlayer extends MatchEvent {
  player?: Player;
}

export interface PlayerWithTeam extends Player {
  team?: Team;
}

export interface StandingRow {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

export interface PlayerStats {
  player_id: string;
  player_name: string;
  team_name: string;
  matches: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  motm: number;
  wins: number;
  ballon_dor_score: number;
}
