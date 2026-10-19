// EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env
// App web (PWA) — installable depuis le navigateur téléphone (Ajouter à l'écran d'accueil)
module.exports = {
  name: "J'aime le foot",
  slug: 'jaime-le-foot',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  scheme: 'jaime-le-foot',
  icon: './assets/icon.png',
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#C9FF00',
  },
  assetBundlePatterns: ['**/*'],
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/icon.png',
    name: "J'aime le foot",
    shortName: "J'aime le foot",
    description: 'Foot amateur entre potes — ligues, matchs, classements joueurs',
    themeColor: '#0B0F0D',
    backgroundColor: '#0B0F0D',
    display: 'standalone',
    lang: 'fr',
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
};
