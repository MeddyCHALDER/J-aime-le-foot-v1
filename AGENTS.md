# J'aime le Foot — repères pour travailler sur le projet

Réseau social pour footballeurs amateurs : chaque joueur a une carte type FIFA
(note globale + six stats), et **tout ce qui se passe sur le terrain la fait
bouger**. C'est le fil rouge du produit — un joueur s'inscrit à un match, l'admin
saisit la feuille, la carte et le classement se recalculent. Toute évolution doit
préserver cette boucle.

## Périmètre de la V1

Ouvert aux utilisateurs : **inscription** et **matchs**. La barre d'onglets ne
montre que Matchs, Carte et Profil ; `/` redirige vers `/club-matches`.

Feed (`/feed`), Direct (`/direct`) et Compétition (`/competition`) restent
construits et fonctionnels — ils ne sont simplement pas exposés dans la barre
d'onglets, pour revenir en V2 sans rien réécrire. Le mode admin est complet.

### Rejoindre un club

Un joueur ne peut s'inscrire à un match que s'il est `TeamMember`. Le champ
`currentClub` de la fiche joueur est un texte libre : il ne rattache à rien.

Le rattachement passe par un **lien d'invitation** : l'admin le fabrique dans
*Effectif*, l'envoie à ses joueurs, et l'ouvrir enchaîne l'onboarding puis
rattache au club.

- Modèle `TeamInvite` — jeton de 32 octets, expiration à 90 jours, réutilisable.
- `POST /teams/:id/invite` (admin) fabrique le lien **et révoque le précédent** :
  c'est le seul moyen de couper l'accès à quelqu'un qui l'aurait déjà reçu.
- `GET /teams/invites/:token` est public et ne renvoie que le nom du club.
- `POST /teams/invites/:token/accept` exige une fiche joueur : le jeton est donc
  mis de côté (`lib/invite.ts`, sessionStorage) et consommé en fin d'onboarding.

## Structure

| Dossier | Quoi |
| --- | --- |
| `backend/` | API Express + Prisma, PostgreSQL (Neon). Préfixe `/api/v1`. |
| `backend/src/routes/` | Un fichier par ressource, monté dans `src/app.js`. |
| `backend/prisma/schema.prisma` | Le modèle de données, source de vérité. |
| `frontend/` | Next.js 16, App Router, Tailwind 3, TypeScript. |
| `frontend/src/lib/` | Client API typé, contextes, règles métier. |
| `frontend/src/components/` | Coquille, barre d'onglets, carte joueur, primitives UI. |

## Lancer le projet

```bash
# API — port 4000
cd backend && npm install && npx prisma generate && node index.js

# Données de démo (ATTENTION : vide toutes les tables, base de dev uniquement)
node prisma/seed-dev.js
# → admin sofianebakkali@fcmonday.fr / password123

# App — port 3000
cd frontend && npm install && npm run dev
```

Le front lit `NEXT_PUBLIC_API_BASE_URL`, défaut `http://localhost:4000/api/v1`.

Sur grand écran l'app se centre d'elle-même dans un cadre téléphone : pas besoin
des outils développeur pour la voir en mobile.

## Application installable (PWA)

L'app s'ajoute à l'écran d'accueil et tourne en plein écran.

- `frontend/public/manifest.webmanifest` — nom, icônes, `display: standalone`,
  raccourcis vers `/carte`, `/club-matches` et `/competition`.
- `frontend/public/sw.js` — service worker. **Il ne met jamais en cache l'API** :
  les réponses sont authentifiées par JWT et finiraient lisibles dans le cache du
  navigateur. Seuls la coquille et les fichiers de build hashés sont gardés.
- `frontend/src/components/PwaRegister.tsx` — enregistrement, désactivé en
  développement (il casserait le rechargement à chaud).
- `frontend/src/components/InstallPrompt.tsx` — invite d'ajout, rendue **dans** le
  cadre téléphone de `AppShell` et non en `position: fixed`, sinon elle flotte
  hors du cadre sur grand écran.
- Icônes dans `frontend/public/icons/`, générées depuis le logo
  (`public/brand/jlf-mark.png`). La version `maskable` garde le glyphe dans la
  zone de sécurité de 80 %.

Le service worker **n'existe qu'en build de production** :

```bash
cd frontend && npm run build && npm start
```

Sur téléphone, l'installation n'est proposée qu'en HTTPS (ou depuis `localhost`).

## Design system — à ne pas contourner

L'app vient d'une maquette précise. Les valeurs ne sont pas décoratives.

- **Couleurs** : uniquement via les jetons CSS de `frontend/src/app/globals.css`
  (`--bg`, `--surface`, `--line`, `--txt`, `--txt2`, `--lime`, `--track`…).
  Jamais de littéral qui ne marche que dans un thème — les deux thèmes, sombre et
  clair, sont pris en charge et basculent sur `<html data-theme>`.
- **Piège déjà rencontré** : un fond de jauge en `rgba(255,255,255,.09)` disparaît
  en thème clair. D'où `--track`. Même vigilance pour tout nouveau fond translucide.
- **Typo** : Chakra Petch *italique 700* pour les titres et **tous les chiffres**
  (classe `.t-num`), Barlow pour le reste. Les classes utilitaires (`.t-title`,
  `.t-section`, `.t-item`, `.t-sub`) sont dans `globals.css`.
- **Lime `#C6FF00`** sur fond sombre uniquement ; sur fond clair il faut
  l'assombrir, il est illisible tel quel.
- **Encre sur lime** : `#12140f`. **Encre sur or** : `#2a2410`.

## Conventions du code

- **Commentaires en français**, et seulement quand ils expliquent un *pourquoi*
  non évident. Pas de paraphrase du code.
- **Client API** : tout passe par `frontend/src/lib/api.ts`. Un appel `fetch` en
  direct dans un composant est une erreur.
- **Contextes** : `session` (jeton, profil, carte), `club` (équipe et championnat
  courants), `prefs` (présentation du feed et du classement), `theme`. Ils sont
  empilés dans `app/layout.tsx`.
- **Règles de carte** : `frontend/src/lib/card-rules.ts` — socle de stats par
  poste, note automatique, impact d'une feuille de match. La note globale se
  déplace **relativement** (du delta affiché à l'admin), elle n'est jamais
  recalculée de zéro : sinon un but ferait chuter une carte élevée.
- **États vides** : quand une donnée n'existe pas côté serveur, l'écran le dit.
  On ne simule jamais une fonctionnalité absente.
- **Mode admin** : préfixe `/admin`, réservé au rôle `ADMIN`, garde dans
  `app/admin/layout.tsx`. La barre d'onglets bascule sur le préfixe de route.

## Pièges du dépôt

- ~~`backend/node_modules` est versionné~~ — **corrigé.** Il embarquait le moteur
  Prisma `darwin-arm64`, inutilisable sur un hébergeur Linux. Les dépendances
  s'installent maintenant sur place ; `.gitignore` les tient à l'écart.
- ~~`backend/.env` est versionné~~ — **corrigé.** Le mot de passe a été changé et
  le fichier est sorti du suivi (`.gitignore` l'ignore, `.env.example` sert de
  modèle). Il reste dans l'historique git : l'ancien mot de passe est mort, ne
  jamais y remettre le nouveau.
- ~~`prisma migrate deploy` échoue sur une base vierge (`P3009`)~~ — **corrigé.**
  Il manquait la table `PlayerMatchStat`, l'enum `MatchResult` et `Match.round`,
  déclarés dans `schema.prisma` mais créés par aucune migration. Les deux
  migrations `20251210100000_add_player_match_stats` et
  `20251210110000_add_match_round` les ajoutent, écrites idempotentes pour ne rien
  casser sur la base de production qui les possède déjà.
  Vérifié : `migrate deploy` sur une base vierge, puis `migrate diff` →
  *No difference detected*.
- ~~Pas de script `start` dans `backend/package.json`~~ — **corrigé.**
- ~~`JWT_SECRET` a un repli en dur~~ — **corrigé.** La lecture est centralisée
  dans `backend/src/config.js` : obligatoire quand `NODE_ENV=production` (le
  serveur refuse de démarrer sans), repli de développement sinon, avec un
  avertissement.
- ~~Les fichiers envoyés renvoyaient 404~~ — **corrigé.** `multer` écrit dans
  `backend/src/uploads` alors que `app.js` servait `backend/uploads`.
- **Les uploads vont sur le disque local** (`multer.diskStorage`) : perdus à chaque
  redéploiement, et `fs.mkdirSync` au chargement du module fait échouer le
  démarrage sur un système de fichiers en lecture seule.
- ~~`app.use(cors())` ouvert à tous les domaines~~ — **corrigé.** Renseigner
  `CORS_ORIGIN` (liste séparée par des virgules) restreint aux origines du
  front ; sans elle, tout passe, ce qui reste pratique en développement.

## Ce qui n'est pas modélisé côté serveur

Ces manques sont signalés dans l'interface plutôt que simulés. Chacun demande une
migration Prisma :

- le **streaming** — l'onglet Direct s'adosse aux matchs du club (en cours =
  direct, terminé = rediffusion) et déduit les temps forts des buts saisis ;
- le **suivi entre joueurs** (abonnés / abonnements) ;
- le **lieu, le format de jeu et le barème** d'un match ;
- les **notes de match**, qui servent au calcul mais ne sont pas stockées — seuls
  buts, passes et cartons le sont.

## Vérifier avant de livrer

```bash
cd frontend && npx tsc --noEmit && npm run build
```

La règle ESLint `react-hooks/set-state-in-effect` remonte sur l'hydratation
depuis `localStorage` et sur les chargements asynchrones. Ce sont des patrons
React corrects, déjà présents partout dans le dépôt — ne pas réécrire le code
pour la faire taire.
