// Lecture centralisée des secrets. En production, JWT_SECRET est obligatoire.

function requireJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    console.error('[config] JWT_SECRET manquant — refus de démarrer en production.');
    process.exit(1);
  }

  console.warn(
    '[config] JWT_SECRET absent — repli de développement. Ne jamais déployer ainsi.'
  );
  return 'dev-secret-jaime-le-foot';
}

function corsOrigin() {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw) return true; // tout passer en local
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = {
  jwtSecret: requireJwtSecret(),
  corsOrigin: corsOrigin(),
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
};
