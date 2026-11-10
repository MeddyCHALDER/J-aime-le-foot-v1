export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  UpdatePassword: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  CreateLeague: undefined;
  JoinLeague: undefined;
  CreateSeason: { leagueId: string };
  CreateMatch: { leagueId: string; seasonId: string };
  MatchDetail: { matchId: string };
  AwardVote: { awardId: string; leagueId: string };
  LeagueMembers: { leagueId: string };
  /** leagueId : ouvert depuis l'écran Joueurs de l'admin (gestion de la photo) */
  PlayerProfile: { playerId: string; leagueId?: string };
  LeagueDetail: { leagueId: string };
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
