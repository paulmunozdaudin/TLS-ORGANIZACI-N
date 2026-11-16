/** Shared plumbing for provider clients. Server-side only: keys never reach the app. */

export class ProviderError extends Error {
  provider: string;
  status?: number;
  /** True when retrying later may work (rate limit, 5xx, network). */
  retryable: boolean;
  constructor(provider: string, message: string, status?: number, retryable = false) {
    super(`${provider}: ${message}`);
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface RequestMeter {
  /** Requests made by this client instance. */
  requests: number;
  /** Quota left as last reported by the provider, when it reports one. */
  remaining: number | null;
}

export function buildUrl(base: string, path: string, params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${base}${path}${query ? `?${query}` : ''}`;
}

/**
 * Collapses identical in-flight requests and remembers answers for `ttlMs`,
 * so one sync run never pays twice for the same call.
 */
export function memoize<T>(ttlMs: number) {
  const cache = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = load().catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, { at: Date.now(), value });
    return value;
  };
}

export const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v));
export const int = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};
export const arr = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' ? (v as Record<string, any>) : {});
