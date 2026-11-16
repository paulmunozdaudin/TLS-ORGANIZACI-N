import { View } from 'react-native';

import { useQuery } from '@/lib/api';
import type { DataStatus } from '@/lib/types';
import { space } from '@/theme/tokens';

import { ago, useNow } from './match';
import { Empty, Notice, Skeleton } from './ui';

export function useDataStatus() {
  return useQuery<DataStatus>('data_status', {}, 120_000);
}

/** Says plainly when data is test data, late, or missing. Renders nothing when all is well. */
export function DataBanner() {
  const { data } = useDataStatus();
  const now = useNow();
  if (!data) return null;
  const odds = data.jobs.filter((j) => j.job === 'odds');
  const lastOk = Math.max(0, ...odds.map((j) => j.last_ok_at ?? 0));
  const failing = odds.find((j) => (j.last_error_at ?? 0) > (j.last_ok_at ?? 0));
  const late = lastOk > 0 && now - lastOk > data.stale_minutes * 60_000;
  return (
    <View style={{ gap: space.sm }}>
      {data.environment === 'test' ? (
        <Notice tone="warn" icon="flask" text="TEST DATA. Synthetic clubs, players and prices from a local test database. Not real football and not real odds." />
      ) : null}
      {data.environment !== 'test' && !odds.length ? (
        <Notice tone="warn" icon="cloud-offline" text="The odds feed has not delivered any prices yet. Markets appear as soon as it does." />
      ) : late || failing ? (
        <Notice
          tone="danger"
          icon="cloud-offline"
          text={`The odds feed is delayed (last update ${lastOk ? ago(lastOk, now) : 'never'}). Prices older than ${data.stale_minutes} minutes are hidden rather than shown as current.`}
        />
      ) : null}
    </View>
  );
}

/** Standard loading / error / empty handling for a query-backed section. */
export function QueryState({ loading, error, onRetry, rows = 3 }: { loading: boolean; error: { message: string } | null; onRetry: () => void; rows?: number }) {
  if (error) return <Empty icon="cloud-offline" title="Could not load this" body={error.message} action="Try again" onAction={onRetry} />;
  if (loading) {
    return (
      <View style={{ gap: space.md }}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={i === 0 ? 120 : 84} />
        ))}
      </View>
    );
  }
  return null;
}
