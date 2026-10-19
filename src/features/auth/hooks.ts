import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from './api';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
      })
      .catch((err) => {
        console.error('[auth] getSession', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = onAuthStateChange((event, s) => {
      if (!mounted) return;
      const next = s as Session | null;

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }

      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    passwordRecovery,
    clearPasswordRecovery: () => setPasswordRecovery(false),
  };
}
