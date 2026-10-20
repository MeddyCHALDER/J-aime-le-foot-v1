-- Trophées personnalisés : l'admin de la ligue choisit les noms et peut supprimer un trophée.
-- Avant : 6 types figés (enum award_type) et un seul trophée par type et par saison.
-- Les trophées existants et leurs votes sont conservés.
-- À exécuter dans Supabase → SQL Editor. Idempotent.

-- Type libre ('custom' pour les trophées créés par l'admin) au lieu de l'enum figé
ALTER TABLE public.season_awards
  ALTER COLUMN type TYPE TEXT USING type::text;

ALTER TABLE public.season_awards
  ALTER COLUMN type SET DEFAULT 'custom';

ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Plus d'unicité (saison, type) : plusieurs trophées personnalisés par saison
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.season_awards'::regclass
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
      ) = ARRAY['season_id', 'type']
  LOOP
    EXECUTE format('ALTER TABLE public.season_awards DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- Nom obligatoire et raisonnable
DO $$
BEGIN
  ALTER TABLE public.season_awards
    ADD CONSTRAINT season_awards_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 60);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Suppression réservée à l'admin de la ligue (nominations et votes partent en cascade)
DROP POLICY IF EXISTS "Awards delete admin" ON public.season_awards;
CREATE POLICY "Awards delete admin" ON public.season_awards
  FOR DELETE TO authenticated
  USING (public.is_season_admin(season_id));
