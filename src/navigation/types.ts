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
  LeagueDetail: { leagueId: string };
  CreateSeason: { leagueId: string };
  CreateMatch: { leagueId: string; seasonId: string };
  MatchDetail: { matchId: string };
  PlayerProfile: { playerId: string };
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
