-- FootWorld V1 - Schéma orienté joueurs, équipes ponctuelles par match
-- Exécuter sur une base vierge ou après avoir supprimé les anciennes tables (001)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ PROFILES (joueurs = utilisateurs) ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  preferred_position TEXT,
  strong_foot TEXT CHECK (strong_foot IN ('left', 'right', 'both')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LEAGUES ============
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ SEASONS ============
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LEAGUE_MEMBERS (membres = joueurs d'une ligue) ============
CREATE TABLE public.league_members (
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, player_id)
);

-- ============ MATCHES ============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  kickoff_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'postponed', 'cancelled')),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  stream_url TEXT,
  replay_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ MATCH_TEAMS (équipes ponctuelles par match) ============
CREATE TABLE public.match_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('home', 'away')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, side)
);

-- ============ MATCH_TEAM_PLAYERS (joueurs dans une équipe du match) ============
CREATE TABLE public.match_team_players (
  match_team_id UUID NOT NULL REFERENCES public.match_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (match_team_id, player_id)
);

-- ============ MATCH_EVENTS ============
CREATE TYPE public.match_event_type AS ENUM ('goal', 'assist', 'yellow', 'red', 'mvp');

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_side TEXT NOT NULL CHECK (team_side IN ('home', 'away')),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.match_event_type NOT NULL,
  minute INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_leagues_created_by ON public.leagues(created_by);
CREATE INDEX idx_seasons_league ON public.seasons(league_id);
CREATE INDEX idx_league_members_league ON public.league_members(league_id);
CREATE INDEX idx_league_members_player ON public.league_members(player_id);
CREATE INDEX idx_matches_season ON public.matches(season_id);
CREATE INDEX idx_matches_kickoff ON public.matches(kickoff_at);
CREATE INDEX idx_match_teams_match ON public.match_teams(match_id);
CREATE INDEX idx_match_team_players_team ON public.match_team_players(match_team_id);
CREATE INDEX idx_match_team_players_player ON public.match_team_players(player_id);
CREATE INDEX idx_match_events_match ON public.match_events(match_id);
CREATE INDEX idx_match_events_player ON public.match_events(player_id);

-- Trigger updated_at
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
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_league_admin(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leagues WHERE id = league_uuid AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_league_member(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members WHERE league_id = league_uuid AND player_id = auth.uid()
  ) OR public.is_league_admin(league_uuid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.league_id_from_season(season_uuid UUID)
RETURNS UUID AS $$
  SELECT league_id FROM public.seasons WHERE id = season_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.league_id_from_match(match_uuid UUID)
RETURNS UUID AS $$
  SELECT s.league_id FROM public.matches m
  JOIN public.seasons s ON s.id = m.season_id
  WHERE m.id = match_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.league_id_from_match_team(match_team_uuid UUID)
RETURNS UUID AS $$
  SELECT s.league_id FROM public.match_teams mt
  JOIN public.matches m ON m.id = mt.match_id
  JOIN public.seasons s ON s.id = m.season_id
  WHERE mt.id = match_team_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: lecture tous, écriture propre profil
CREATE POLICY "Profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profile update own" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Leagues: lecture si membre ou créateur
CREATE POLICY "Leagues read" ON public.leagues FOR SELECT USING (
  public.is_league_member(id)
);
CREATE POLICY "Leagues create" ON public.leagues FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Leagues update" ON public.leagues FOR UPDATE USING (created_by = auth.uid());

-- Seasons: idem via league
CREATE POLICY "Seasons read" ON public.seasons FOR SELECT USING (
  public.is_league_member(league_id)
);
CREATE POLICY "Seasons insert" ON public.seasons FOR INSERT WITH CHECK (
  public.is_league_admin(league_id)
);
CREATE POLICY "Seasons update" ON public.seasons FOR UPDATE USING (
  public.is_league_admin(league_id)
);

-- League members: lecture si membre ligue
CREATE POLICY "League members read" ON public.league_members FOR SELECT USING (
  public.is_league_member(league_id)
);
CREATE POLICY "League members insert" ON public.league_members FOR INSERT WITH CHECK (
  public.is_league_admin(league_id)
);
CREATE POLICY "League members delete" ON public.league_members FOR DELETE USING (
  public.is_league_admin(league_id)
);

-- Matches: lecture/écriture si membre ligue (via season)
CREATE POLICY "Matches read" ON public.matches FOR SELECT USING (
  public.is_league_member(public.league_id_from_match(id))
);
CREATE POLICY "Matches insert" ON public.matches FOR INSERT WITH CHECK (
  public.is_league_member(public.league_id_from_season(season_id))
);
CREATE POLICY "Matches update" ON public.matches FOR UPDATE USING (
  public.is_league_member(public.league_id_from_match(id))
);

-- Match teams
CREATE POLICY "Match teams read" ON public.match_teams FOR SELECT USING (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match teams insert" ON public.match_teams FOR INSERT WITH CHECK (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match teams update" ON public.match_teams FOR UPDATE USING (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match teams delete" ON public.match_teams FOR DELETE USING (
  public.is_league_member(public.league_id_from_match(match_id))
);

-- Match team players
CREATE POLICY "Match team players read" ON public.match_team_players FOR SELECT USING (
  public.is_league_member(public.league_id_from_match_team(match_team_id))
);
CREATE POLICY "Match team players insert" ON public.match_team_players FOR INSERT WITH CHECK (
  public.is_league_member(public.league_id_from_match_team(match_team_id))
);
CREATE POLICY "Match team players delete" ON public.match_team_players FOR DELETE USING (
  public.is_league_member(public.league_id_from_match_team(match_team_id))
);

-- Match events
CREATE POLICY "Match events read" ON public.match_events FOR SELECT USING (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match events insert" ON public.match_events FOR INSERT WITH CHECK (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match events update" ON public.match_events FOR UPDATE USING (
  public.is_league_member(public.league_id_from_match(match_id))
);
CREATE POLICY "Match events delete" ON public.match_events FOR DELETE USING (
  public.is_league_member(public.league_id_from_match(match_id))
);
