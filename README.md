# J'aime le foot (FootWorld)

**Application web (PWA)** — foot amateur entre potes. Accessible dans le navigateur, installable sur l’écran d’accueil du téléphone (iOS / Android) sans App Store.

## Stack

- **Expo** ~52 + **React Native Web** + **TypeScript**
- **UI** : React Native Paper (Material 3)
- **Navigation** : React Navigation (stack)
- **State** : TanStack Query
- **Backend** : Supabase (Auth + Postgres + RLS)
- **Emails** : [Resend](https://resend.com) (invitations via Edge Function)
- **PWA** : `public/manifest.json` + service worker + icônes

## Prérequis

- Node.js 18+ (idéalement 20+)
- Compte [Supabase](https://supabase.com)

> **Astuce Mac** : évitez de lancer le projet depuis le **Desktop iCloud** (`node_modules` trop lent). Préférez un dossier local, ex. `~/Developer/J-aime-le-foot-v1`.

## Installation

```bash
npm install
```

## Configuration Supabase

1. Créez un projet Sur [Supabase](https://app.supabase.com).
2. Dans **SQL Editor**, exécutez :
   `supabase/migrations/002_footworld_v1_player_centric.sql`
3. Activez **Authentication > Email**.
4. Créez un `.env` à la racine :

```env
EXPO_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
```

## Emails avec Resend

### 1) Invitations de ligue (Edge Function)

1. Crée une clé API sur [resend.com](https://resend.com) (domaine vérifié, ou `onboarding@resend.dev` en test).
2. Dans **Supabase → Edge Functions → Secrets**, ajoute :
   - `RESEND_API_KEY` = `re_...`
   - `RESEND_FROM_EMAIL` = `J'aime le foot <onboarding@resend.dev>` (ou ton domaine)
   - `APP_URL` = `https://www.jaimelefoot.app` (prod Vercel)
3. Déploie la fonction (une fois) :
   ```bash
   npx supabase login
   npx supabase link --project-ref bavfngaiqwjhufdasjcr
   npx supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="hello@aiworkplace.io" APP_URL=https://www.jaimelefoot.app
   npx supabase functions deploy send-invite
   ```
4. Dans l’app (prod ou local) : ligue → onglet **Joueurs** → email → **Envoyer l’invitation par email**.

> Les valeurs `RESEND_*` / `APP_URL` du fichier `.env` local ne sont **pas** lues par Expo : elles doivent être dans les **secrets** Supabase Edge Functions.

### 2) Emails Auth Supabase (optionnel)

Pour les mails de confirmation / reset password via Resend :  
[Intégration Resend ↔ Supabase](https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase) (SMTP custom dans Auth).

## Lancement (web)

```bash
npm start
# ou
npx expo start --web
```

Ouvre l’URL locale (souvent `http://localhost:8081`) dans le navigateur téléphone (même Wi‑Fi) ou en mode responsive.

### Installer sur le téléphone

1. Déploie l’app en **HTTPS** (obligatoire pour une vraie PWA, sauf localhost).
2. Sur **Android (Chrome)** : menu → « Installer l’application » / « Ajouter à l’écran d’accueil ».
3. Sur **iPhone (Safari)** : Partager → « Sur l’écran d’accueil ».

## Build & déploiement

```bash
npm run build:web   # génère le dossier dist/
npm run serve:web   # test local de la build
```

Déploie le contenu de `dist/` sur Vercel, Netlify, Cloudflare Pages, ou tout hébergeur static. Les fichiers de `public/` (manifest, icônes, SW) sont inclus.

## Fonctionnalités V1

- Auth email/password
- Ligues + saisons + membres
- Matchs avec **équipes ponctuelles** (joueurs choisis parmi les membres)
- Classements **par joueur**, awards, FUT Card

Voir `ARBORESCENCE_V1.md` pour le détail.

## Structure utile

- `App.tsx` — shell web (largeur max type téléphone)
- `public/manifest.json` — manifeste PWA
- `public/sw.js` — service worker
- `src/features/*` — modules métier
