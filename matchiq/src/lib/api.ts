import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from './supabase';

/** A failed call. `code` is the stable server code (e.g. ODDS_CHANGED); `message` is for people. */
export class ApiError extends Error {
  code: string;
  detail: string | null;
  constructor(code: string, message: string, detail: string | null = null) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

/** Every read and write goes through a Postgres function; nothing is computed on trust in the client. */
export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new ApiError('NOT_CONFIGURED', 'The app is not connected to a backend.');
  let result;
  try {
    result = await supabase.rpc(fn, args);
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server. Check your connection.');
  }
  const { data, error } = result;
  if (!error) return data as T;
  if (error.code === 'P0001') throw new ApiError(error.message, error.hint || error.message, error.details || null);
  if (!error.code && /fetch|network/i.test(error.message)) throw new ApiError('NETWORK', 'Could not reach the server. Check your connection.');
  throw new ApiError(error.code || 'SERVER', 'Something went wrong on our side. Try again in a moment.', error.message);
}

/* ------------------------------------------------------------------ queries */

const subscribers = new Map<string, Set<() => void>>();

/** Reloads every mounted query whose key starts with one of the prefixes. */
export function invalidate(...prefixes: string[]) {
  for (const [key, set] of subscribers) {
    if (prefixes.some((p) => key.startsWith(p))) set.forEach((reload) => reload());
  }
}

export interface Query<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads `fn(args)` and keeps it fresh: on mount, when the screen regains
 * focus, on `invalidate`, and every `refreshMs` if given.
 */
export function useQuery<T>(fn: string | null, args: Record<string, unknown> = {}, refreshMs?: number): Query<T> {
  const key = fn ? `${fn}:${JSON.stringify(args)}` : '';
  const [state, setState] = useState<{ key: string; data?: T; error: ApiError | null }>({ key: '', error: null });
  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
  }, [key]);

  const load = useCallback(() => {
    if (!key) return;
    const [name, json] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    call<T>(name, JSON.parse(json)).then(
      (data) => latest.current === key && setState({ key, data, error: null }),
      (error: ApiError) => latest.current === key && setState((s) => ({ key, data: s.key === key ? s.data : undefined, error }))
    );
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const set = subscribers.get(key) ?? new Set();
    subscribers.set(key, set);
    set.add(load);
    const timer = refreshMs ? setInterval(load, refreshMs) : null;
    return () => {
      set.delete(load);
      if (!set.size) subscribers.delete(key);
      if (timer) clearInterval(timer);
    };
  }, [key, load, refreshMs]);

  useFocusEffect(load);

  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: Boolean(key) && (!current || (state.data === undefined && !state.error)),
    reload: load,
  };
}
