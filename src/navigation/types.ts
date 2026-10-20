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
  PlayerProfile: { playerId: string };
  LeagueDetail: { leagueId: string };
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
