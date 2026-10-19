// Petit client API pour communiquer avec le backend

import type {
  Award,
  ClubMatch,
  ClubMatchStat,
  Paginated,
  PlayerCard,
  PlayerDetail,
  PlayerProfile,
  Post,
  RankingRow,
  Team,
  TeamInvite,
  Tournament,
  UserSummary,
} from './types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorBody: { error?: string };
    try {
      errorBody = (await res.json()) as { error?: string };
    } catch {
      errorBody = { error: "Erreur inconnue" };
    }
    const err = new Error(errorBody.error || "Erreur API") as Error & { status?: number }
    err.status = res.status
    throw err
  }

  return (await res.json()) as T;
}

/** Une 404 attendue (pas encore de profil, pas encore de carte) n'est pas une erreur. */
export async function apiFetchOrNull<T>(
  path: string,
  options: RequestInit = {},
  authToken?: string
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options, authToken)
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null
    throw err
  }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
})

const put = (body: unknown): RequestInit => ({
  method: 'PUT',
  body: JSON.stringify(body),
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthResponse {
  user: UserSummary & { role: import('./types').UserRole }
  token: string
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; username?: string }) =>
      apiFetch<AuthResponse>('/auth/register', json(body)),
    login: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/login', json(body)),
  },

  // -------------------------------------------------------------------------
  // Joueur — profil et carte (les 6 stats + la note globale)
  // -------------------------------------------------------------------------
  players: {
    me: (token: string) => apiFetchOrNull<PlayerProfile>('/players/me', {}, token),
    all: () => apiFetch<Pick<PlayerProfile, 'id' | 'firstName' | 'lastName' | 'position'>[]>(
      '/players/all'
    ),
    byId: (id: string) => apiFetch<PlayerDetail>(`/players/${id}`),
    byUsername: (username: string) => apiFetch<PlayerDetail>(`/players/username/${username}`),
    create: (body: Partial<PlayerProfile>, token: string) =>
      apiFetch<PlayerProfile>('/players', json(body), token),
    update: (body: Partial<PlayerProfile>, token: string) =>
      apiFetch<PlayerProfile>('/players/me', put(body), token),
    myCard: (token: string) => apiFetchOrNull<PlayerCard>('/players/me/card', {}, token),
    createCard: (body: Omit<PlayerCard, 'id' | 'playerProfileId' | 'createdAt'>, token: string) =>
      apiFetch<PlayerCard>('/players/me/card', json(body), token),
    updateCard: (body: Partial<PlayerCard>, token: string) =>
      apiFetch<PlayerCard>('/players/me/card', put(body), token),
    /** Recalcul admin de la carte d'un joueur, après validation d'une feuille. */
    updateCardOf: (playerProfileId: string, body: Partial<PlayerCard>, token: string) =>
      apiFetch<PlayerCard>(`/players/${playerProfileId}/card`, put(body), token),
  },

  users: {
    me: (token: string) => apiFetch<UserSummary>('/users/me', {}, token),
    /** Bascule Joueur / Admin depuis l'écran Effectif. */
    setRole: (userId: string, role: import('./types').UserRole, token: string) =>
      apiFetch<UserSummary>(`/users/${userId}/role`, put({ role }), token),
  },

  // -------------------------------------------------------------------------
  // Feed vidéo
  // -------------------------------------------------------------------------
  posts: {
    list: (params: { page?: number; limit?: number; userId?: string; search?: string } = {}) => {
      const q = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.set(k, String(v))
      })
      const qs = q.toString()
      return apiFetch<Paginated<Post>>(`/posts${qs ? `?${qs}` : ''}`)
    },
    byId: (id: string) => apiFetch<Post>(`/posts/${id}`),
    create: (body: { title: string; description?: string; videoUrl: string }, token: string) =>
      apiFetch<Post>('/posts', json(body), token),
    /** Bascule le like — le backend ajoute ou retire selon l'état courant
     *  et ne renvoie que le nouvel état, pas le total. */
    like: (id: string, token: string) =>
      apiFetch<{ liked: boolean }>(`/posts/${id}/like`, { method: 'POST' }, token),
    comment: (id: string, content: string, token: string) =>
      apiFetch<import('./types').PostComment>(`/posts/${id}/comments`, json({ content }), token),
  },

  // -------------------------------------------------------------------------
  // Club et effectif
  // -------------------------------------------------------------------------
  teams: {
    list: () => apiFetch<Team[]>('/teams'),
    byId: (id: string) => apiFetch<Team>(`/teams/${id}`),
    mine: (token: string) => apiFetch<Team[]>('/teams/me/teams', {}, token),
    create: (body: { name: string; logoUrl?: string | null }, token: string) =>
      apiFetch<Team>('/teams', json(body), token),
    addMember: (teamId: string, playerProfileId: string, token: string) =>
      apiFetch<import('./types').TeamMember>(
        `/teams/${teamId}/members`,
        json({ playerProfileId }),
        token
      ),

    /** Lien d'invitation courant du club (admin). `null` s'il n'en existe pas. */
    invite: (teamId: string, token: string) =>
      apiFetch<TeamInvite | null>(`/teams/${teamId}/invite`, {}, token),

    /** Fabrique un lien et révoque le précédent. */
    createInvite: (teamId: string, token: string) =>
      apiFetch<TeamInvite>(`/teams/${teamId}/invite`, { method: 'POST' }, token),

    /** Lecture publique : le joueur voit quel club l'invite avant de s'inscrire. */
    inviteInfo: (inviteToken: string) =>
      apiFetch<{ team: Team }>(`/teams/invites/${encodeURIComponent(inviteToken)}`),

    /** Rattache le joueur connecté au club. */
    acceptInvite: (inviteToken: string, token: string) =>
      apiFetch<{ team: Team; alreadyMember: boolean }>(
        `/teams/invites/${encodeURIComponent(inviteToken)}/accept`,
        { method: 'POST' },
        token
      ),
  },

  // -------------------------------------------------------------------------
  // Matchs intra-club — inscription et feuille de match
  // -------------------------------------------------------------------------
  clubMatches: {
    byTeam: (teamId: string, params: { status?: string; upcoming?: boolean } = {}) => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      if (params.upcoming) q.set('upcoming', 'true')
      const qs = q.toString()
      return apiFetch<ClubMatch[]>(`/club-matches/team/${teamId}${qs ? `?${qs}` : ''}`)
    },
    byId: (id: string) => apiFetch<ClubMatch>(`/club-matches/${id}`),
    mine: (token: string) => apiFetch<ClubMatch[]>('/club-matches/me/matches', {}, token),
    create: (
      body: {
        teamId: string
        matchDate: string
        round?: number
        tournamentId?: string
        maxPlayers?: number
      },
      token: string
    ) => apiFetch<ClubMatch>('/club-matches', json(body), token),
    update: (
      id: string,
      body: { matchDate?: string; round?: number; status?: string; maxPlayers?: number },
      token: string
    ) => apiFetch<ClubMatch>(`/club-matches/${id}`, put(body), token),
    register: (id: string, token: string) =>
      apiFetch<import('./types').ClubMatchRegistration>(
        `/club-matches/${id}/register`,
        { method: 'POST' },
        token
      ),
    unregister: (id: string, token: string) =>
      apiFetch<{ message: string }>(`/club-matches/${id}/register`, { method: 'DELETE' }, token),
    /** Une ligne de feuille de match par joueur (upsert côté backend). */
    saveStat: (
      id: string,
      body: {
        playerProfileId: string
        teamId?: string
        goals?: number
        assists?: number
        yellowCards?: number
        redCards?: number
        minutesPlayed?: number
        matchResult?: import('./types').MatchResult
      },
      token: string
    ) => apiFetch<ClubMatchStat>(`/club-matches/${id}/stats`, json(body), token),
  },

  // -------------------------------------------------------------------------
  // Compétition
  // -------------------------------------------------------------------------
  championships: {
    list: () => apiFetch<Tournament[]>('/championships'),
    byId: (id: string) => apiFetch<Tournament>(`/championships/${id}`),
    create: (body: { name: string; season?: string }, token: string) =>
      apiFetch<Tournament>('/championships', json(body), token),
    addTeam: (id: string, teamId: string, token: string) =>
      apiFetch<unknown>(`/championships/${id}/teams`, json({ teamId }), token),
    ranking: (id: string, sortBy: 'points' | 'goals' | 'assists' = 'points') =>
      apiFetch<{ ranking: RankingRow[]; sortBy: string }>(
        `/championships/${id}/player-ranking?sortBy=${sortBy}`
      ),
  },

  tournaments: {
    list: () => apiFetch<Tournament[]>('/tournaments'),
    create: (body: { name: string; type?: 'CUP' | 'LEAGUE'; season?: string }, token: string) =>
      apiFetch<Tournament>('/tournaments', json(body), token),
    addTeam: (id: string, teamId: string, token: string) =>
      apiFetch<unknown>(`/tournaments/${id}/teams`, json({ teamId }), token),
  },

  awards: {
    list: () => apiFetch<Award[]>('/awards'),
    byId: (id: string) => apiFetch<Award>(`/awards/${id}`),
    vote: (id: string, nominationId: string, token: string) =>
      apiFetch<unknown>(`/awards/${id}/vote`, json({ nominationId }), token),
  },

  upload: (file: File, token: string) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch<{ url: string }>('/upload', { method: 'POST', body: form }, token)
  },
}
