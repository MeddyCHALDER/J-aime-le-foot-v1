import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
// Pas de slash final : évite "requested path is invalid" (double slash dans les requêtes)
const supabaseUrl = (extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const supabaseAnonKey = (extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    '[Supabase] Configuration manquante. Dans votre fichier .env à la racine, ajoutez exactement:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://VOTRE_REF.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...\n' +
    'Puis redémarrez avec: npx expo start --clear';
  console.error(msg);
  throw new Error(msg);
}

// Stockage de la session (AsyncStorage : compatible web + natif)
const storageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
