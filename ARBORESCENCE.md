# FootWorld – Arborescence V1 (feature-based)

```
src/
├── lib/
│   ├── supabase.ts       # Client Supabase + storage AsyncStorage
│   └── queryClient.ts    # TanStack Query client
├── theme/
│   └── paperTheme.ts     # Thème Paper (light/dark, roundness 12)
├── types/
│   └── entities.ts       # League, Season, Team, Player, Match, MatchEvent, StandingRow, PlayerStats
├── ui/
│   ├── Screen.tsx        # Layout: title, subtitle, headerRight, content
│   ├── EmptyState.tsx    # Titre + message + CTA
│   ├── SectionHeader.tsx # Titre de section
│   ├── StatChip.tsx      # Chip (label, selected, onPress)
│   ├── EntityCard.tsx    # Card: title, subtitle, chips, onPress
│   ├── LoadingState.tsx  # Spinner + message
│   ├── ErrorState.tsx    # Message + Réessayer
│   └── index.ts
├── navigation/
│   ├── types.ts          # AuthStackParamList, AppStackParamList, RootStackParamList
│   └── RootNavigator.tsx # Stack: Login, Register, Main, CreateLeague, LeagueDetail, MatchDetail
├── features/
│   ├── auth/
│   │   ├── api.ts        # signIn, signUp, signOut, getSession, onAuthStateChange
│   │   ├── hooks.ts      # useAuth
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── leagues/
│   │   ├── api.ts        # fetchLeagues, fetchLeagueById, fetchSeasonsByLeague, createLeague, ...
│   │   ├── hooks.ts      # useLeagues, useLeague, useSeasonsByLeague, useCreateLeague
│   │   └── components/
│   │       ├── LeagueListScreen.tsx   # Liste + FAB "Nouvelle ligue"
│   │       ├── CreateLeagueScreen.tsx # Formulaire nom + ville
│   │       └── LeagueDetailScreen.tsx# Tabs: Classement, Matchs, Awards
│   ├── matches/
│   │   ├── api.ts        # fetchTeamsBySeason, fetchMatchesBySeason, fetchMatchById, fetchTeamById, fetchEventsByMatch
│   │   ├── hooks.ts      # useTeamsBySeason, useMatch, useMatchEvents, ...
│   │   └── components/
│   │       └── MatchDetailScreen.tsx # Score, événements, bouton "Voir le match/replay"
│   ├── standings/
│   │   └── calc.ts       # computeStandings(matches, teams) -> StandingRow[]
│   └── awards/
│       ├── api.ts        # fetchPlayersBySeason, fetchEventsBySeason
│       └── calc.ts       # computePlayerStats, computeAllPlayersStats (Ballon d'Or: buts*4 + passes*3 + motm*5 + victoires*1 - jaunes*1 - rouges*3)
```

## Navigation

- **Non connecté** : Login → Register
- **Connecté** : Main (liste ligues) → CreateLeague | LeagueDetail(leagueId) → MatchDetail(matchId)
- **LeagueDetail** : onglets Classement, Matchs, Awards (SegmentedButtons)

## Démarrage

```bash
npm install
npx expo start --clear
```

Variables d'environnement : `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
