-- Trophées réservés à certains postes : l'admin coche un ou plusieurs postes, et seuls
-- les joueurs de ces postes peuvent recevoir des voix (tous les membres votent toujours).
--   1. season_awards.positions (NULL ou vide = ouvert à tous) ;
--   2. position_code() : le poste libre du profil ramené à un code ;
--   3. league_roster renvoie le poste de chaque joueur ;
--   4. cast_award_vote refuse un joueur hors poste ;
--   5. changer les postes d'un trophée retire les voix devenues hors poste.
-- À exécuter dans Supabase → SQL Editor. Idempotent.

-- 1. Postes du trophée -------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS positions TEXT[];

DO $$
BEGIN
  ALTER TABLE public.season_awards
    ADD CONSTRAINT season_awards_positions_known
    CHECK (positions <@ ARRAY['GK', 'CB', 'FB', 'CM', 'CAM', 'W', 'ST']::TEXT[]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Le Golden Glove récompense un gardien : on l'indique pour les trophées déjà créés.
UPDATE public.season_awards
SET positions = ARRAY['GK']
WHERE type = 'golden_glove' AND positions IS NULL;

-- 2. Code du poste -----------------------------------------------------------
-- Même règle que positionShort() (src/features/cards/positions.ts) : à garder alignées.
CREATE OR REPLACE FUNCTION public.position_code(p_position TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL OR p = '' THEN NULL
    WHEN strpos(p, 'gard') > 0 THEN 'GK'
    WHEN strpos(p, 'déf') > 0 OR strpos(p, 'def') > 0 OR p = 'dc' THEN 'CB'
    WHEN strpos(p, 'lat') > 0 THEN 'FB'
    WHEN strpos(p, 'moc') > 0 OR strpos(p, 'meneur') > 0 THEN 'CAM'
    WHEN strpos(p, 'ail') > 0 THEN 'W'
    WHEN strpos(p, 'att') > 0 OR strpos(p, 'bu') > 0 THEN 'ST'
    WHEN strpos(p, 'mil') > 0 OR strpos(p, 'mc') > 0 THEN 'CM'
    ELSE upper(left(p_position, 3))
  END
  FROM (SELECT lower(p_position) AS p) x;
$$;

-- Le joueur peut-il recevoir des voix pour ce trophée ?
CREATE OR REPLACE FUNCTION public.award_accepts_player(p_award_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- COALESCE : sans poste renseigné, la comparaison vaut NULL, qu'il faut lire comme « non ».
  SELECT COALESCE(cardinality(a.positions), 0) = 0
    OR COALESCE(public.position_code(p.preferred_position) = ANY (a.positions), false)
  FROM public.season_awards a
  LEFT JOIN public.profiles p ON p.id = p_player_id
  WHERE a.id = p_award_id;
$$;

-- 3. Liste des joueurs avec leur poste ---------------------------------------
-- Le type de retour change : la fonction doit être recréée.
DROP FUNCTION IF EXISTS public.league_roster(UUID);

CREATE FUNCTION public.league_roster(p_league_id UUID)
RETURNS TABLE (player_id UUID, display_name TEXT, avatar_url TEXT, role TEXT, preferred_position TEXT)
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
    NULLIF(trim(p.preferred_position), '') AS preferred_position
  FROM public.league_members m
  LEFT JOIN public.profiles p ON p.id = m.player_id
  LEFT JOIN auth.users u ON u.id = m.player_id
  WHERE m.league_id = p_league_id
    AND public.is_league_member(p_league_id)
  ORDER BY 2;
$$;

GRANT EXECUTE ON FUNCTION public.league_roster(UUID) TO authenticated;

-- 4. Vote : même contrat que la 006, plus le contrôle du poste ------------------
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
  IF NOT public.award_accepts_player(p_award_id, p_player_id) THEN
    RAISE EXCEPTION 'Ce trophée est réservé à d''autres postes';
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

GRANT EXECUTE ON FUNCTION public.cast_award_vote(UUID, UUID) TO authenticated;

-- 5. Postes modifiés : les voix pour un joueur devenu hors poste sont retirées -----
-- Sinon un défenseur pourrait gagner un trophée réservé aux gardiens. Les votants
-- concernés retrouvent le trophée « à voter ».
CREATE OR REPLACE FUNCTION public.season_awards_prune_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.award_votes v
  USING public.award_nominations n
  WHERE v.nomination_id = n.id
    AND v.award_id = NEW.id
    AND NOT public.award_accepts_player(NEW.id, n.player_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS season_awards_prune_votes ON public.season_awards;
CREATE TRIGGER season_awards_prune_votes
  AFTER UPDATE OF positions ON public.season_awards
  FOR EACH ROW
  WHEN (OLD.positions IS DISTINCT FROM NEW.positions)
  EXECUTE FUNCTION public.season_awards_prune_votes();
