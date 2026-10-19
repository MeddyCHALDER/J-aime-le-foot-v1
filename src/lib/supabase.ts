import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl?: string;
};

// Pas de slash final : évite "requested path is invalid" (double slash dans les requêtes)
const supabaseUrl = (extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');
const supabaseAnonKey = (extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    '[Supabase] Configuration manquante. Ajoute EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (local .env + Vercel).';
  console.error(msg);
  throw new Error(msg);
}

/** URL publique de l’app (liens email reset, etc.). */
export function getAppUrl() {
  const fromEnv = (extra.appUrl ?? process.env.EXPO_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://www.jaimelefoot.app';
}

/**
 * localStorage sur le web : AsyncStorage (RN Web) peut ne pas persister
 * correctement la session → l’app reste sur l’écran de login après connexion.
 */
const authStorage =
  Platform.OS === 'web' && typeof localStorage !== 'undefined'
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
