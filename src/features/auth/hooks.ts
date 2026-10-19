import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from './api';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = onAuthStateChange((_event, s) => {
      setSession(s as Session | null);
      setUser((s as Session | null)?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading, isAuthenticated: !!user };
}
