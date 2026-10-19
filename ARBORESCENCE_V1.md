# FootWorld V1 — Arborescence (classement par joueur, équipes ponctuelles)

## Schéma DB (migration 002)

- **profiles** : id, email, display_name, avatar_url, preferred_position, strong_foot, bio
- **leagues** : id, name, city, created_by
- **seasons** : id, league_id, name, is_active, start_date, end_date
- **league_members** : league_id, player_id, role (admin | player)
- **matches** : id, season_id, kickoff_at, location, status, home_score, away_score, stream_url, replay_url
- **match_teams** : id, match_id, side (home | away), name (équipe ponctuelle)
- **match_team_players** : match_team_id, player_id, position
- **match_events** : id, match_id, team_side, player_id, type (goal | assist | yellow | red | mvp), minute

Pas de table `teams` ni `players` : les joueurs = profiles, les équipes sont créées par match.

## App

```
src/
├── lib/              supabase.ts, queryClient.ts
├── theme/            paperTheme.ts (vert #C9FF00, texte noir)
├── types/            entities.ts (Profile, League, Season, LeagueMember, Match, MatchTeam, MatchTeamPlayer, MatchEvent, PlayerStandingRow, PlayerStats)
├── ui/               Screen, EmptyState, SectionHeader, StatChip, EntityCard, FutCard, LoadingState, ErrorState
├── navigation/       RootNavigator.tsx, types.ts (Stack: Login, Register, Main, CreateLeague, LeagueDetail, CreateSeason, CreateMatch, MatchDetail, PlayerProfile)
├── features/
│   ├── auth/         api.ts, hooks.ts, LoginScreen, RegisterScreen
│   ├── leagues/      api.ts, hooks.ts, LeagueListScreen (Home), LeagueDetailScreen (Tabs: Players, Matches, Rankings), CreateLeagueScreen, CreateSeasonScreen
│   ├── members/      api.ts, hooks.ts (league_members + profiles)
│   ├── profiles/     api.ts, hooks.ts, PlayerProfileScreen
│   ├── matches/      api.ts, hooks.ts, CreateMatchScreen (form + builder équipes), MatchDetailScreen
│   └── rankings/     calc.ts (computePlayerStandings, computePlayerStats, buildMatchSidesMap — points, Ballon d'Or, FUT rating 1-99)
```

## Flux

1. **Auth** : Login / Register (Supabase Auth).
2. **Home** : liste des ligues (RLS : créateur ou membre). FAB « Nouvelle ligue ».
3. **Ligue** : onglets **Joueurs** (membres + profil), **Matchs** (liste + FAB « Match »), **Classements** (points joueur, top buteurs/passeurs, Ballon d'Or, FUT Cards).
4. **Nouveau match** : date/lieu → création match + 2 équipes (Equipe A / Equipe B) → sélection joueurs Home/Away (chips) → valider.
5. **Détail match** : score, équipes ponctuelles, événements (but, passe, jaune, rouge, MVP), bouton « Voir le match » (stream/replay).
6. **Profil joueur** : nom, photo, poste, pied fort, bio, FutCard (note 50 par défaut si pas de stats saison).

## Règles de calcul

- **Points joueur** : victoire +3, nul +1, défaite +0 ; but +1, passe +1, MVP +2 ; jaune -1, rouge -3.
- **Ballon d'Or** : buts×4 + passes×3 + mvp×5 + victoires×1 - jaunes×1 - rouges×3.
- **FUT rating (1-99)** : base 50 + (buts/match)×20 + (passes/match)×15 + (%victoires)×20 + (mvp/match)×10 - (cartons/match)×10, clamp 1-99.

## Déploiement schéma

Sur une base vierge (ou après suppression des tables de 001), exécuter dans l’éditeur SQL Supabase :

`supabase/migrations/002_footworld_v1_player_centric.sql`
