import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, call } from './api';
import { supabase } from './supabase';
import type { Profile } from './types';

interface SessionState {
  /** False until the stored session has been read. */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

const authMessage = (message: string) =>
  /invalid login/i.test(message)
    ? 'Wrong email or password.'
    : /already registered|already exists/i.test(message)
      ? 'There is already an account with that email.'
      : /password/i.test(message)
        ? 'Passwords need at least 6 characters.'
        : /fetch|network/i.test(message)
          ? 'Could not reach the server. Check your connection.'
          : message;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfile(await call<Profile>('my_profile'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    call<Profile>('my_profile').then(
      (p) => !cancelled && setProfile(p),
      () => !cancelled && setProfile(null)
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<SessionState>(
    () => ({
      ready,
      session,
      profile: userId && profile?.id === userId ? profile : null,
      refreshProfile,
      async signIn(email, password) {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new ApiError('AUTH', authMessage(error.message));
      },
      async signUp(email, password, username) {
        const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { data: { username } } });
        if (error) throw new ApiError('AUTH', authMessage(error.message));
        return { needsEmailConfirmation: !data.session };
      },
      async signOut() {
        await supabase!.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, userId, refreshProfile]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
