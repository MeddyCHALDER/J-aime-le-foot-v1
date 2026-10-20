/** Entités FootWorld V1 — classement par joueur, équipes ponctuelles par match */

export interface Profile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  preferred_position: string | null;
  strong_foot: 'left' | 'right' | 'both' | null;
  bio: string | null;
  created_at: string;
  updated_at?: string;
}

export interface League {
  id: string;
  name: string;
  city: string | null;
  created_by: string;
  invite_code?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Season {
  id: string;
  league_id: string;
  name: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LeagueMember {
  league_id: string;
  player_id: string;
  role: 'admin' | 'player';
  joined_at: string;
}

export type MatchStatus = 'scheduled' | 'played' | 'postponed' | 'cancelled';

export interface Match {
  id: string;
  season_id: string;
  kickoff_at: string;
  location: string | null;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  stream_url: string | null;
  replay_url: string | null;
  /** Ouverture programmée des inscriptions (null = ouvertes), migration 011 */
  registration_opens_at?: string | null;
  /** Nombre de places (null = illimité), migration 012 */
  max_players?: number | null;
  created_at: string;
  updated_at?: string;
}

export type MatchTeamSide = 'home' | 'away';

export interface MatchTeam {
  id: string;
  match_id: string;
  side: MatchTeamSide;
  name: string;
  created_at?: string;
}

export interface MatchTeamPlayer {
  match_team_id: string;
  player_id: string;
  position: string | null;
  created_at?: string;
}

export type MatchEventType = 'goal' | 'assist' | 'yellow' | 'red' | 'mvp';

export interface MatchEvent {
  id: string;
  match_id: string;
  team_side: MatchTeamSide;
  player_id: string;
  type: MatchEventType;
  minute: number | null;
  created_at?: string;
}

/** Profil + infos membre (pour liste joueurs ligue) */
export interface LeagueMemberWithProfile extends LeagueMember {
  profile: Profile | null;
}

/** Match avec équipes ponctuelles */
export interface MatchWithTeams extends Match {
  match_teams?: Array<MatchTeam & { players?: Array<MatchTeamPlayer & { profile?: Profile | null }> }>;
}

export interface MatchEventWithPlayer extends MatchEvent {
  profile?: Profile | null;
}

/** Classement PAR JOUEUR (points) */
export interface PlayerStandingRow {
  player_id: string;
  player_name: string;
  avatar_url: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goals: number;
  assists: number;
  mvp: number;
  yellow: number;
  red: number;
}

/** Stats joueur pour Awards + FUT */
export interface PlayerStats {
  player_id: string;
  player_name: string;
  avatar_url: string | null;
  preferred_position: string | null;
  matches: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  mvp: number;
  wins: number;
  points: number;
  ballon_dor_score: number;
  fut_rating: number; // 1-99
}
