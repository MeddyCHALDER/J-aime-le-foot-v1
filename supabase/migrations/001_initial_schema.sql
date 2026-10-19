-- FootWorld - Schéma initial + RLS
-- Exécuter dans l'éditeur SQL Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ PROFILES ============
-- Synchronisé avec auth.users (trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LEAGUES ============
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LEAGUE_FOLLOWS (ligues suivies par l'utilisateur) ============
CREATE TABLE public.league_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, league_id)
);

-- ============ SEASONS ============
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ TEAMS ============
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ PLAYERS ============
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ MATCHES ============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'postponed', 'cancelled')),
  stream_url TEXT,
  replay_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

-- ============ MATCH_EVENTS ============
CREATE TYPE match_event_type AS ENUM ('goal', 'assist', 'yellow_card', 'red_card', 'motm');

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type match_event_type NOT NULL,
  minute INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_leagues_manager ON public.leagues(manager_id);
CREATE INDEX idx_league_follows_user ON public.league_follows(user_id);
CREATE INDEX idx_seasons_league ON public.seasons(league_id);
CREATE INDEX idx_teams_season ON public.teams(season_id);
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_matches_season ON public.matches(season_id);
CREATE INDEX idx_matches_date ON public.matches(match_date);
CREATE INDEX idx_match_events_match ON public.match_events(match_id);
CREATE INDEX idx_match_events_player ON public.match_events(player_id);

-- Trigger mise à jour updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leagues_updated_at BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILES: création auto à l'inscription ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Helper: vérifier si l'utilisateur est manager d'une ligue
CREATE OR REPLACE FUNCTION public.is_league_manager(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leagues WHERE id = league_uuid AND manager_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: récupérer league_id depuis une table enfant (season, team, etc.)
CREATE OR REPLACE FUNCTION public.league_id_from_season(season_uuid UUID)
RETURNS UUID AS $$
  SELECT league_id FROM public.seasons WHERE id = season_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.league_id_from_team(team_uuid UUID)
RETURNS UUID AS $$
  SELECT l.id FROM public.teams t
  JOIN public.seasons s ON s.id = t.season_id
  JOIN public.leagues l ON l.id = s.league_id
  WHERE t.id = team_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.league_id_from_match(match_uuid UUID)
RETURNS UUID AS $$
  SELECT league_id_from_season(season_id) FROM public.matches WHERE id = match_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------- PROFILES ----------
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ---------- LEAGUES ----------
-- Lecture: tout le monde peut voir les ligues (spectateurs)
CREATE POLICY "Anyone can view leagues" ON public.leagues
  FOR SELECT USING (true);
-- Écriture: seul le manager
CREATE POLICY "Manager can insert league" ON public.leagues
  FOR INSERT WITH CHECK (manager_id = auth.uid());
CREATE POLICY "Manager can update own league" ON public.leagues
  FOR UPDATE USING (manager_id = auth.uid());
CREATE POLICY "Manager can delete own league" ON public.leagues
  FOR DELETE USING (manager_id = auth.uid());

-- ---------- LEAGUE_FOLLOWS ----------
CREATE POLICY "Users can view own follows" ON public.league_follows
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own follow" ON public.league_follows
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own follow" ON public.league_follows
  FOR DELETE USING (user_id = auth.uid());

-- ---------- SEASONS ----------
CREATE POLICY "Anyone can view seasons" ON public.seasons
  FOR SELECT USING (true);
CREATE POLICY "Manager can insert season" ON public.seasons
  FOR INSERT WITH CHECK (public.is_league_manager(league_id));
CREATE POLICY "Manager can update season" ON public.seasons
  FOR UPDATE USING (public.is_league_manager(league_id));
CREATE POLICY "Manager can delete season" ON public.seasons
  FOR DELETE USING (public.is_league_manager(league_id));

-- ---------- TEAMS ----------
CREATE POLICY "Anyone can view teams" ON public.teams
  FOR SELECT USING (true);
CREATE POLICY "Manager can insert team" ON public.teams
  FOR INSERT WITH CHECK (public.is_league_manager(public.league_id_from_season(season_id)));
CREATE POLICY "Manager can update team" ON public.teams
  FOR UPDATE USING (public.is_league_manager(public.league_id_from_team(id)));
CREATE POLICY "Manager can delete team" ON public.teams
  FOR DELETE USING (public.is_league_manager(public.league_id_from_team(id)));

-- ---------- PLAYERS ----------
CREATE POLICY "Anyone can view players" ON public.players
  FOR SELECT USING (true);
CREATE POLICY "Manager can insert player" ON public.players
  FOR INSERT WITH CHECK (public.is_league_manager(public.league_id_from_team(team_id)));
CREATE POLICY "Manager can update player" ON public.players
  FOR UPDATE USING (public.is_league_manager(public.league_id_from_team(team_id)));
CREATE POLICY "Manager can delete player" ON public.players
  FOR DELETE USING (public.is_league_manager(public.league_id_from_team(team_id)));

-- ---------- MATCHES ----------
CREATE POLICY "Anyone can view matches" ON public.matches
  FOR SELECT USING (true);
CREATE POLICY "Manager can insert match" ON public.matches
  FOR INSERT WITH CHECK (public.is_league_manager(public.league_id_from_season(season_id)));
CREATE POLICY "Manager can update match" ON public.matches
  FOR UPDATE USING (public.is_league_manager(public.league_id_from_match(id)));
CREATE POLICY "Manager can delete match" ON public.matches
  FOR DELETE USING (public.is_league_manager(public.league_id_from_match(id)));

-- ---------- MATCH_EVENTS ----------
CREATE POLICY "Anyone can view match_events" ON public.match_events
  FOR SELECT USING (true);
CREATE POLICY "Manager can insert match_event" ON public.match_events
  FOR INSERT WITH CHECK (public.is_league_manager(public.league_id_from_match(match_id)));
CREATE POLICY "Manager can update match_event" ON public.match_events
  FOR UPDATE USING (public.is_league_manager(public.league_id_from_match(match_id)));
CREATE POLICY "Manager can delete match_event" ON public.match_events
  FOR DELETE USING (public.is_league_manager(public.league_id_from_match(match_id)));
