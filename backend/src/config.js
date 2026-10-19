// Configuration lue depuis l'environnement, validée au démarrage.
// Un seul endroit : auth.js et le middleware partageaient avant deux copies
// du même repli en dur.

const DEV_SECRET = "dev-secret-jaime-le-foot";

const isProduction = process.env.NODE_ENV === "production";

function readJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  // En production, un secret par défaut connu de quiconque lit le dépôt
  // permettrait de forger un jeton admin. On refuse de démarrer.
  if (isProduction) {
    console.error(
      "JWT_SECRET est obligatoire en production : sans lui, n'importe qui " +
        "peut forger un jeton. Démarrage interrompu."
    );
    process.exit(1);
  }

  console.warn("JWT_SECRET absent : repli de développement utilisé. Ne jamais déployer ainsi.");
  return DEV_SECRET;
}

/**
 * Origines autorisées à appeler l'API.
 * Non renseignée, on laisse tout passer — pratique en développement, à
 * restreindre en production via CORS_ORIGIN (liste séparée par des virgules).
 */
function readCorsOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    if (isProduction) {
      console.warn(
        "CORS_ORIGIN non renseignée : l'API accepte toutes les origines. " +
          "Renseigner l'URL du front en production."
      );
    }
    return null;
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

module.exports = {
  isProduction,
  JWT_SECRET: readJwtSecret(),
  CORS_ORIGINS: readCorsOrigins(),
};
