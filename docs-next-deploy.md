# Mettre « J'aime le Foot » en ligne

Le dépôt contient **deux applications** :

| Dossier | Quoi | Où l'héberger |
| --- | --- | --- |
| `frontend/` | Next.js 16 | **Vercel** |
| `backend/` | Express + Prisma, serveur persistant | **Pas sur Vercel** — voir plus bas |

---

## 1. Avant tout : la V1 doit être sur `master`

La branche par défaut du dépôt est `master`, et elle ne contient encore que
l'application d'origine. Tout le travail est sur
`claude/app-idea-explanation-eqw05r`.

```bash
git checkout master
git pull origin master
git merge claude/app-idea-explanation-eqw05r
git push origin master
```

Sans cette étape, Vercel déploie l'ancienne version.

> L'erreur « *The provided GitHub repository does not contain the requested
> branch* » vient de là : Vercel cherche `main` par défaut, ce dépôt utilise
> `master`. Le réglage est dans **Settings → Git → Production Branch**.

---

## 2. Le backend : pas sur Vercel

`backend/index.js` appelle `app.listen()` : c'est un serveur qui tourne en
continu. Vercel exécute des fonctions sans état, qui démarrent et s'arrêtent à
chaque requête — ce modèle ne convient pas tel quel.

Héberge l'API sur une plateforme qui fait tourner un processus Node :
**Render**, **Railway** ou **Fly.io**. Le script `start` existe déjà.

### Réglages (exemple Render)

Le fichier [`render.yaml`](../render.yaml) à la racine du dépôt est un Blueprint :

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connecter le dépôt `MeddyCHALDER/J-aime-le-foot-v1`
3. Renseigner **`DATABASE_URL`** avec une URI Postgres qui commence par
   `postgresql://`. Sur **Supabase** : Project Settings → Database →
   **Connection string** → choisir **Session pooler** (pas « Direct »).

   - Direct `db.<ref>.supabase.co:5432` échoue souvent depuis Render
     (`P1001` : hôte IPv6-only).
   - Pooler (IPv4), exemple :
     `postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`
   - Pour Prisma + PgBouncer en mode transaction (port `6543`), ajouter
     `?pgbouncer=true` ; pour `migrate deploy`, préférer le **Session** pooler
     (port `5432` sur l’hôte `pooler.supabase.com`).

4. `JWT_SECRET` est généré automatiquement ; `CORS_ORIGIN` pointe déjà vers `jaimelefoot.app`

Si le build a déjà échoué : **Service → Environment → DATABASE_URL** → coller
l’URI pooler → **Save** → **Manual Deploy → Deploy latest commit**.

Réglages manuels équivalents :

- **Root Directory** : `backend`
- **Build Command** : `npm install && bash scripts/deploy-db.sh`
  (gère le cas P3005 : base Supabase déjà remplie par les migrations Expo)
- **Start Command** : `npm start`
- **Health Check Path** : `/api/v1/health`

### Variables d'environnement

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `DATABASE_URL` | la chaîne Neon | oui |
| `JWT_SECRET` | chaîne longue et aléatoire | **oui** — le serveur refuse de démarrer sans, en production |
| `CORS_ORIGIN` | l'URL Vercel du front, ex. `https://jaimelefoot.vercel.app` | fortement conseillé |
| `NODE_ENV` | `production` | oui |

Pour fabriquer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 3. Le frontend sur Vercel

C'est un **monorepo** : sans réglage, Vercel cherche un projet Next.js à la
racine et échoue.

- **Root Directory** : `frontend`
- **Framework Preset** : Next.js (détecté)
- **Production Branch** : `master`

### Variable d'environnement

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<ton-api>/api/v1` |

Sans elle, l'app appelle `http://localhost:4000` et **aucune donnée ne
s'affichera en ligne**. Le préfixe `/api/v1` fait partie de la valeur.

---

## 4. Ordre des opérations

1. Déployer l'API et noter son URL.
2. Déployer le front sur Vercel avec `NEXT_PUBLIC_API_BASE_URL` pointant dessus.
3. Revenir sur l'API et renseigner `CORS_ORIGIN` avec l'URL Vercel.
4. Créer le premier compte depuis `/onboarding`, puis le passer admin :

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'ton@email.fr';
```

5. Dans l'app, en admin : créer une équipe, puis **Effectif → créer le lien
   d'invitation** et l'envoyer aux joueurs.

---

## 5. Points à connaître

- **`backend/node_modules` a été sorti du suivi git.** Il contenait le moteur
  Prisma compilé pour macOS (`darwin-arm64`), inutilisable sur un hébergeur
  Linux : l'API échouait au démarrage sur « Query engine binary for current
  platform could not be found ». Les dépendances s'installent désormais sur
  l'hébergeur, pour sa plateforme.
- **Les fichiers envoyés** vont sur le disque local et disparaissent à chaque
  redéploiement. Sans effet aujourd'hui : aucun écran de la V1 n'envoie de
  fichier. À traiter (Cloudflare R2) avec la fonctionnalité photo.
- **Le service worker** n'est actif qu'en production, donc l'ajout à l'écran
  d'accueil ne se teste qu'une fois déployé, en HTTPS.
