-- L'admin contrôle sa ligue : lui seul invite, il accepte ou refuse les nouveaux joueurs,
-- et il peut suspendre, réintégrer ou retirer des joueurs.
--   1. Ligues visibles par leurs seuls membres (avant : tout le monde, même sans compte, voyait
--      toutes les ligues et leur code d'invitation) ;
--   2. league_members.status : 'pending' (demande à valider), 'active' ou 'suspended' ;
--      rejoindre avec le code crée une demande ; le joueur ne voit la ligue qu'une fois accepté ;
--   3. set_member_status / remove_league_member / regenerate_invite_code (admin uniquement) ;
--   4. un joueur suspendu ne peut ni s'inscrire aux matchs, ni voter, ni être choisi dans un vote,
--      et ne peut pas revenir avec le code tant que l'admin ne l'a pas réintégré.
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée.

-- 1. Ligues visibles par leurs membres uniquement ------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leagues' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leagues', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Leagues read members" ON public.leagues
  FOR SELECT TO authenticated
  USING (public.is_league_member(id));

-- 2. Statut des membres --------------------------------------------------------
ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  ALTER TABLE public.league_members
    ADD CONSTRAINT league_members_status_check CHECK (status IN ('pending', 'active', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Membre (accepté, même suspendu) ou gérant : droit de voir la ligue.
-- Une demande en attente ne donne accès à rien.
CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.league_members m
      WHERE m.league_id = p_league_id AND m.player_id = auth.uid() AND m.status <> 'pending'
    )
    OR public.league_manager_id(p_league_id) = auth.uid()
  );
$$;

-- Chacun voit sa propre ligne de membre (même en attente), pour connaître son statut
DROP POLICY IF EXISTS "Members read own row" ON public.league_members;
CREATE POLICY "Members read own row" ON public.league_members
  FOR SELECT TO authenticated USING (player_id = auth.uid());

-- Mes demandes en attente (le nom de la ligue n'est pas lisible tant qu'on n'est pas accepté)
CREATE OR REPLACE FUNCTION public.my_join_requests()
RETURNS TABLE (league_id UUID, league_name TEXT, requested_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.league_id, l.name, m.joined_at
  FROM public.league_members m
  JOIN public.leagues l ON l.id = m.league_id
  WHERE m.player_id = auth.uid() AND m.status = 'pending'
  ORDER BY m.joined_at DESC;
$$;

-- Membre actif (accepté, non suspendu) ou gérant : droit d'agir (s'inscrire, voter)
CREATE OR REPLACE FUNCTION public.is_active_member(p_league_id UUID, p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user IS NOT NULL AND (
    public.league_manager_id(p_league_id) = p_user
    OR EXISTS (
      SELECT 1 FROM public.league_members m
      WHERE m.league_id = p_league_id AND m.player_id = p_user AND m.status = 'active'
    )
  );
$$;

-- 3. Actions de l'admin ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_member_status(p_league_id UUID, p_player_id UUID, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.league_manager_id(p_league_id) IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Seul l''admin de la ligue peut gérer les joueurs';
  END IF;
  -- 'active' sert aussi à accepter une demande ; refuser = remove_league_member
  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;
  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'Tu ne peux pas te suspendre toi-même';
  END IF;
  UPDATE public.league_members
  SET status = p_status
  WHERE league_id = p_league_id AND player_id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ce joueur n''est pas dans la ligue';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_league_member(p_league_id UUID, p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.league_manager_id(p_league_id) IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Seul l''admin de la ligue peut retirer un joueur';
  END IF;
  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'Tu ne peux pas te retirer de ta propre ligue';
  END IF;
  DELETE FROM public.league_members
  WHERE league_id = p_league_id AND player_id = p_player_id;
END;
$$;

-- Nouveau code : l'ancien lien d'invitation ne fonctionne plus
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_league_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
BEGIN
  IF public.league_manager_id(p_league_id) IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Seul l''admin de la ligue peut changer le code';
  END IF;
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues WHERE upper(invite_code) = code);
  END LOOP;
  UPDATE public.leagues SET invite_code = code WHERE id = p_league_id;
  RETURN code;
END;
$$;

-- 4. Suspension appliquée partout -------------------------------------------------
-- Rejoindre : crée une demande à valider par l'admin ; un joueur suspendu ne revient pas avec le code
CREATE OR REPLACE FUNCTION public.join_league_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT id INTO lid
  FROM public.leagues
  WHERE upper(invite_code) = upper(trim(p_code));

  IF lid IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = lid AND player_id = auth.uid() AND status = 'suspended'
  ) THEN
    RAISE EXCEPTION 'Ton accès à cette ligue est suspendu par l''admin';
  END IF;

  -- Déjà membre ou déjà demandé : rien ne change
  INSERT INTO public.league_members (league_id, player_id, role, status, joined_at)
  VALUES (lid, auth.uid(), 'player', 'pending', now())
  ON CONFLICT (league_id, player_id) DO NOTHING;

  RETURN lid;
END;
$$;

-- Inscriptions aux matchs : même garde qu'en 012, plus le refus des joueurs suspendus
CREATE OR REPLACE FUNCTION public.match_attendance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opens TIMESTAMPTZ;
  lid UUID;
  is_admin BOOLEAN := public.is_match_admin(NEW.match_id);
BEGIN
  IF NOT is_admin THEN
    IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
      SELECT m.registration_opens_at, s.league_id INTO opens, lid
      FROM public.matches m JOIN public.seasons s ON s.id = m.season_id
      WHERE m.id = NEW.match_id;
      IF NOT public.is_active_member(lid, NEW.user_id) THEN
        RAISE EXCEPTION 'Ton accès à cette ligue est suspendu par l''admin';
      END IF;
      IF opens IS NOT NULL AND opens > now() THEN
        RAISE EXCEPTION 'Les inscriptions ouvrent le %',
          to_char(opens AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI');
      END IF;
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.team_side := NULL;
    ELSE
      NEW.team_side := OLD.team_side;
    END IF;
  END IF;

  IF NEW.status = 'in' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'in' THEN
      NEW.in_at := now();
    ELSE
      NEW.in_at := OLD.in_at;
    END IF;
  ELSE
    NEW.in_at := NULL;
    NEW.team_side := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Votes (un joueur) : votant et joueur choisi doivent être actifs
CREATE OR REPLACE FUNCTION public.cast_award_vote(p_award_id UUID, p_player_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lid UUID;
  open_ BOOLEAN;
  nid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT s.league_id, a.is_open INTO lid, open_
  FROM public.season_awards a
  JOIN public.seasons s ON s.id = a.season_id
  WHERE a.id = p_award_id;

  IF lid IS NULL THEN RAISE EXCEPTION 'Trophée introuvable'; END IF;
  IF NOT open_ THEN RAISE EXCEPTION 'Ce vote est clôturé'; END IF;
  IF NOT public.is_active_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre actif de la ligue pour voter';
  END IF;
  IF p_player_id = auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas voter pour toi'; END IF;
  IF NOT public.is_active_member(lid, p_player_id) THEN
    RAISE EXCEPTION 'Ce joueur ne peut pas recevoir de vote';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id) VALUES (p_player_id), (auth.uid())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;

  INSERT INTO public.award_nominations (award_id, player_id)
  VALUES (p_award_id, p_player_id)
  ON CONFLICT (award_id, player_id) DO NOTHING;

  SELECT id INTO nid FROM public.award_nominations
  WHERE award_id = p_award_id AND player_id = p_player_id;

  INSERT INTO public.award_votes (award_id, nomination_id, voter_id)
  VALUES (p_award_id, nid, auth.uid())
  ON CONFLICT (award_id, voter_id) DO UPDATE SET nomination_id = EXCLUDED.nomination_id;

  RETURN nid;
END;
$$;

-- Votes (équipe type) : mêmes règles qu'en 013, plus le statut actif
CREATE OR REPLACE FUNCTION public.cast_lineup_vote(p_award_id UUID, p_slots JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
  lid UUID;
  n INT;
  distinct_n INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT sa.*, s.league_id AS lg INTO a
  FROM public.season_awards sa
  JOIN public.seasons s ON s.id = sa.season_id
  WHERE sa.id = p_award_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Trophée introuvable'; END IF;
  IF a.kind <> 'lineup' THEN RAISE EXCEPTION 'Ce trophée se vote pour un seul joueur'; END IF;
  IF NOT a.is_open THEN RAISE EXCEPTION 'Ce vote est clôturé'; END IF;
  lid := a.lg;
  IF NOT public.is_active_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre actif de la ligue pour voter';
  END IF;
  IF jsonb_typeof(p_slots) <> 'object' THEN RAISE EXCEPTION 'Compo invalide'; END IF;

  SELECT count(*), count(DISTINCT value) INTO n, distinct_n FROM jsonb_each_text(p_slots);
  IF n <> a.lineup_size THEN
    RAISE EXCEPTION 'Place les % joueurs avant de valider', a.lineup_size;
  END IF;
  IF distinct_n <> n THEN RAISE EXCEPTION 'Un joueur ne peut occuper qu''un seul poste'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_slots) WHERE value = auth.uid()::text) THEN
    RAISE EXCEPTION 'Tu ne peux pas te mettre dans ton équipe type';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_slots) e
    WHERE NOT public.is_active_member(lid, e.value::uuid)
  ) THEN
    RAISE EXCEPTION 'Un des joueurs n''est pas (ou plus) actif dans la ligue';
  END IF;

  INSERT INTO public.award_lineup_votes (award_id, voter_id, slots, updated_at)
  VALUES (p_award_id, auth.uid(), p_slots, now())
  ON CONFLICT (award_id, voter_id) DO UPDATE SET slots = EXCLUDED.slots, updated_at = now();
END;
$$;

-- Liste des joueurs : le statut en plus (type de retour changé → recréation)
DROP FUNCTION IF EXISTS public.league_roster(UUID);

CREATE FUNCTION public.league_roster(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  overall INT,
  preferred_position TEXT,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.player_id,
    COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Joueur') AS display_name,
    p.avatar_url,
    m.role,
    c.overall::int AS overall,
    NULLIF(to_jsonb(p) ->> 'preferred_position', '') AS preferred_position,
    m.status
  FROM public.league_members m
  LEFT JOIN public.profiles p ON p.id = m.player_id
  LEFT JOIN auth.users u ON u.id = m.player_id
  LEFT JOIN public.player_cards c ON c.player_id = m.player_id
  WHERE m.league_id = p_league_id
    AND public.is_league_member(p_league_id)
  ORDER BY 2;
$$;

GRANT EXECUTE ON FUNCTION public.league_roster(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_status(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_league_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_join_requests() TO authenticated;
