-- Tout nouveau joueur démarre avec une note globale de 85.
-- Concerne les cartes créées par la base (ex. premier match validé d'un joueur sans carte) ;
-- l'app crée aussi ses cartes à 85. Les cartes existantes ne sont pas modifiées.
-- À exécuter dans Supabase → SQL Editor. Idempotent.

ALTER TABLE public.player_cards
  ALTER COLUMN overall SET DEFAULT 85;
