-- Équipe type : l'admin départage les égalités.
--   season_awards.tie_picks : { poste: player_id } choisi par l'admin quand plusieurs
--   joueurs ont autant de voix pour un même poste. Modifiable par l'admin via la
--   policy « Awards update admin » existante, lisible par tous comme le reste du trophée.
-- À exécuter dans Supabase → SQL Editor, après la 020. Idempotent.

ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS tie_picks JSONB NOT NULL DEFAULT '{}'::jsonb;
