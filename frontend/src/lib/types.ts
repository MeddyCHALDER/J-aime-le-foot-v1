// Formes renvoyées par le backend Express/Prisma (backend/src/routes).
// Elles suivent le schéma Prisma : sérialisées en JSON, les DateTime sont des chaînes ISO.

export type UserRole = 'PLAYER' | 'COACH' | 'ADMIN'
export type MatchResult = 'WIN' | 'DRAW' | 'LOSS'
export type ClubMatchStatus = 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED'
export type TournamentType = 'CUP' | 'LEAGUE'
export type AwardType =
  | 'BALLON_DOR'
  | 'PUSKAS'
  | 'PICHICHI'
  | 'GOLDEN_GLOVE'
  | 'BEST_YOUNG'

export interface UserSummary {
  id: string
  email: string
  username: string | null
  role?: UserRole
  /** Joint sur l'auteur d'un post : le feed affiche le nom du joueur. */
  playerProfile?: {
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
}

export interface PlayerCard {
  id: string
  playerProfileId: string
  overallRating: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  imageUrl: string | null
  createdAt: string
}

export interface PlayerProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  birthDate: string | null
  position: string | null
  strongFoot: string | null
  heightCm: number | null
  weightKg: number | null
  currentClub: string | null
  shirtNumber: number | null
  avatarUrl: string | null
  user?: UserSummary
  cards?: PlayerCard[]
}

/** Agrégat renvoyé par GET /players/:id — cumul toutes compétitions. */
export interface PlayerAggregatedStats {
  totalGoals: number
  totalAssists: number
  totalMatches: number
  totalWins: number
  totalDraws: number
  totalLosses: number
  totalPoints: number
  championships: {
    id: string
    name: string
    goals: number
    assists: number
    matches: number
    points: number
  }[]
}

export interface PlayerDetail {
  profile: PlayerProfile
  stats: PlayerAggregatedStats
}

export interface PostComment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  user?: UserSummary
}

export interface PostLike {
  id: string
  postId: string
  userId: string
  createdAt: string
  user?: UserSummary
}

export interface Post {
  id: string
  userId: string
  type: 'VIDEO' | 'TEXT'
  videoUrl: string | null
  thumbnailUrl: string | null
  title: string
  description: string | null
  createdAt: string
  user?: UserSummary
  likes?: PostLike[]
  comments?: PostComment[]
  _count?: { likes: number; comments: number }
}

export interface Paginated<T> {
  posts: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/** Lien d'invitation à un club, fabriqué par l'admin et partagé aux joueurs. */
export interface TeamInvite {
  id: string
  token: string
  teamId: string
  createdAt: string
  expiresAt: string | null
  usedCount: number
}

export interface Team {
  id: string
  name: string
  logoUrl: string | null
  createdAt: string
  members?: TeamMember[]
  _count?: { members: number }
}

export interface TeamMember {
  id: string
  teamId: string
  playerProfileId: string
  joinedAt: string
  playerProfile?: PlayerProfile
}

export interface Tournament {
  id: string
  name: string
  type: TournamentType
  season: string | null
  createdById: string
  createdAt: string
  _count?: { teams: number; matches: number }
}

export interface ClubMatchRegistration {
  id: string
  clubMatchId: string
  playerProfileId: string
  userId: string
  registeredAt: string
  playerProfile?: PlayerProfile
}

export interface ClubMatchStat {
  id: string
  clubMatchId: string
  playerProfileId: string
  teamId: string | null
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  minutesPlayed: number | null
  matchResult: MatchResult | null
  playerProfile?: PlayerProfile
  team?: { id: string; name: string } | null
}

export interface ClubMatch {
  id: string
  teamId: string
  tournamentId: string | null
  matchDate: string
  round: number | null
  status: ClubMatchStatus
  maxPlayers: number | null
  createdById: string
  createdAt: string
  team?: Team
  tournament?: { id: string; name: string; type?: TournamentType } | null
  registrations?: ClubMatchRegistration[]
  stats?: ClubMatchStat[]
  _count?: { registrations: number; stats?: number }
}

/** Ligne de GET /championships/:id/player-ranking. */
export interface RankingRow {
  player: {
    id: string
    firstName: string
    lastName: string
    position: string | null
    email: string
  }
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  points: number
}

export interface AwardNomination {
  id: string
  awardId: string
  playerProfileId: string
  postId: string | null
  playerProfile?: PlayerProfile
  post?: { id: string; title: string; videoUrl: string | null } | null
  _count?: { votes: number }
}

export interface Award {
  id: string
  type: AwardType
  name: string
  season: string | null
  tournamentId: string | null
  createdAt: string
  tournament?: { id: string; name: string } | null
  nominations?: AwardNomination[]
  _count?: { votes: number }
}
