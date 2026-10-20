-- Membres de ligue + votes ouverts à tous les joueurs de la ligue.
-- La prod (schéma legacy) n'a pas de table league_members : join_league_by_code échouait
-- et les votes ne proposaient que l'admin. Cette migration :
--   1. crée league_members (si absente) et la remplit (gérants, abonnés, inscrits aux matchs) ;
--   2. ajoute automatiquement le gérant comme admin de chaque nouvelle ligue ;
--   3. expose la liste des joueurs aux membres (league_roster), noms compris ;
--   4. permet de voter pour n'importe quel joueur de la ligue (cast_award_vote).
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée.

-- 1. Table des membres -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.league_members (
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, player_id)
);

CREATE INDEX IF NOT EXISTS league_members_player_idx ON public.league_members (player_id);

-- Gérant d'une ligue (manager_id en legacy, created_by en V1)
CREATE OR REPLACE FUNCTION public.league_manager_id(p_league_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(to_jsonb(l) ->> 'manager_id', to_jsonb(l) ->> 'created_by')::uuid
  FROM public.leagues l
  WHERE l.id = p_league_id;
$$;

-- Membre (ou gérant) de la ligue ? SECURITY DEFINER : évite la récursion RLS.
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
      WHERE m.league_id = p_league_id AND m.player_id = auth.uid()
    )
    OR public.league_manager_id(p_league_id) = auth.uid()
  );
$$;

-- Remplissage : gérants (admin), abonnés legacy, inscrits aux matchs (joueurs)
INSERT INTO public.league_members (league_id, player_id, role)
SELECT l.id, public.league_manager_id(l.id), 'admin'
FROM public.leagues l
WHERE public.league_manager_id(l.id) IS NOT NULL
ON CONFLICT (league_id, player_id) DO UPDATE SET role = 'admin';

DO $$
BEGIN
  IF to_regclass('public.league_follows') IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, player_id, role)
    SELECT f.league_id, f.user_id, 'player'
    FROM public.league_follows f
    ON CONFLICT (league_id, player_id) DO NOTHING;
  END IF;

  IF to_regclass('public.match_attendance') IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, player_id, role)
    SELECT DISTINCT s.league_id, a.user_id, 'player'
    FROM public.match_attendance a
    JOIN public.matches m ON m.id = a.match_id
    JOIN public.seasons s ON s.id = m.season_id
    ON CONFLICT (league_id, player_id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own leagues" ON public.league_members;
DROP POLICY IF EXISTS "Members leave" ON public.league_members;

-- Un membre voit les membres de ses ligues ; l'ajout passe par join_league_by_code.
CREATE POLICY "Members read own leagues" ON public.league_members
  FOR SELECT TO authenticated USING (public.is_league_member(league_id));

CREATE POLICY "Members leave" ON public.league_members
  FOR DELETE TO authenticated
  USING (player_id = auth.uid() OR public.league_manager_id(league_id) = auth.uid());

-- 2. Gérant ajouté comme admin à la création d'une ligue ----------------------
CREATE OR REPLACE FUNCTION public.league_add_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mid UUID := COALESCE(to_jsonb(NEW) ->> 'manager_id', to_jsonb(NEW) ->> 'created_by')::uuid;
BEGIN
  IF mid IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, player_id, role)
    VALUES (NEW.id, mid, 'admin')
    ON CONFLICT (league_id, player_id) DO UPDATE SET role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_add_manager ON public.leagues;
CREATE TRIGGER league_add_manager
  AFTER INSERT ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.league_add_manager();

-- Rejoindre via code : même contrat que la 003, fonctionne maintenant que la table existe.
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

  INSERT INTO public.league_members (league_id, player_id, role)
  VALUES (lid, auth.uid(), 'player')
  ON CONFLICT (league_id, player_id) DO NOTHING;

  RETURN lid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_league_by_code(TEXT) TO authenticated;

-- 3. Liste des joueurs d'une ligue (réservée à ses membres) --------------------
-- Les profils des autres ne sont pas lisibles en prod : le nom passe par cette fonction.
CREATE OR REPLACE FUNCTION public.league_roster(p_league_id UUID)
RETURNS TABLE (player_id UUID, display_name TEXT, avatar_url TEXT, role TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.player_id,
    COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Joueur') AS display_name,
    p.avatar_url,
    m.role
  FROM public.league_members m
  LEFT JOIN public.profiles p ON p.id = m.player_id
  LEFT JOIN auth.users u ON u.id = m.player_id
  WHERE m.league_id = p_league_id
    AND public.is_league_member(p_league_id)
  ORDER BY 2;
$$;

GRANT EXECUTE ON FUNCTION public.league_roster(UUID) TO authenticated;

-- 4. Voter pour n'importe quel joueur de la ligue -------------------------------
-- Crée la nomination à la volée (les nominés ne sont plus figés à l'ouverture),
-- puis enregistre ou remplace le vote. Pas de vote pour soi-même.
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

  IF lid IS NULL THEN
    RAISE EXCEPTION 'Trophée introuvable';
  END IF;
  IF NOT open_ THEN
    RAISE EXCEPTION 'Ce vote est clôturé';
  END IF;
  IF NOT public.is_league_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre de la ligue pour voter';
  END IF;
  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'Tu ne peux pas voter pour toi';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.league_members m WHERE m.league_id = lid AND m.player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'Ce joueur n''est pas dans la ligue';
  END IF;

  -- Les nominations et votes référencent profiles : on s'assure que les lignes existent
  -- (sans échouer si le schéma impose d'autres colonnes ; le trigger d'inscription les crée déjà).
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

GRANT EXECUTE ON FUNCTION public.cast_award_vote(UUID, UUID) TO authenticated;
