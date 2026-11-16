import { impliedProbability } from '@core/odds.ts';
import { formatDay, formatStamp, formatTime } from '@core/season.ts';
import { netProfit, stakeError, totalReturn } from '@core/wallet.ts';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError, call, invalidate } from '@/lib/api';
import { buzz, toast } from '@/lib/feedback';
import type { DisplayPrice } from '@/lib/pricing';
import type { Fixture, FixtureListItem, Market, PredictionStatus, Selection } from '@/lib/types';
import { coins, color, font, odds, radius, space } from '@/theme/tokens';

import { Button, Card, Chip, Field, Icon, Notice, Pill, Row, Sheet, TeamBadge, Txt } from './ui';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function countdown(ms: number) {
  if (ms <= 0) return 'now';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ago(at: number, now: number) {
  const mins = Math.max(0, Math.floor((now - at) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  return `${Math.floor(mins / 1440)} d ago`;
}

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const STATUS_TEXT: Record<Fixture['status'], string> = {
  scheduled: '',
  live: 'LIVE',
  finished: 'FT',
  postponed: 'POSTPONED',
  cancelled: 'CANCELLED',
  abandoned: 'ABANDONED',
  awarded: 'AWARDED',
  suspended: 'SUSPENDED',
  unknown: 'STATUS UNKNOWN',
};

export function StatusPill({ fixture }: { fixture: Fixture }) {
  if (fixture.status === 'scheduled') return <Txt v="num" style={{ fontSize: 15 }}>{formatTime(fixture.kickoff_at)}</Txt>;
  if (fixture.status === 'live') {
    const clock = fixture.status_raw === 'HT' ? 'HT' : fixture.elapsed != null ? `${fixture.elapsed}′` : 'LIVE';
    return <Pill label={clock} tone="danger" icon="radio" />;
  }
  return <Pill label={STATUS_TEXT[fixture.status]} tone={fixture.status === 'finished' ? 'muted' : 'warn'} />;
}

/** One fixture in a list, with the match-result consensus when it is priced. */
export function FixtureCard({ fixture, showDay }: { fixture: FixtureListItem; showDay?: boolean }) {
  const p = fixture.result_prices;
  const started = fixture.status !== 'scheduled';
  const line = (team: Fixture['home'], goals: number | null) => (
    <Row gap={space.md}>
      <TeamBadge team={team} size={26} />
      <Txt v="bodyBold" numberOfLines={1} style={{ flex: 1 }}>{team.name}</Txt>
      {started && goals != null ? <Txt v="num">{goals}</Txt> : null}
    </Row>
  );
  return (
    <Card onPress={() => router.push(`/match/${fixture.id}`)} pad={space.lg}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="caption" c={color.muted} numberOfLines={1} style={{ flex: 1 }}>
          {fixture.competition.name}
          {showDay ? ` · ${formatDay(fixture.kickoff_at)}` : ''}
        </Txt>
        <StatusPill fixture={fixture} />
      </Row>
      <View style={{ gap: space.sm }}>
        {line(fixture.home, fixture.home_goals)}
        {line(fixture.away, fixture.away_goals)}
      </View>
      {fixture.status === 'scheduled' ? (
        p && (p.home?.avg || p.draw?.avg || p.away?.avg) ? (
          <Row gap={space.sm}>
            {(['home', 'draw', 'away'] as const).map((k) => (
              <View key={k} style={{ flex: 1, height: 40, borderRadius: radius.sm, backgroundColor: color.surfaceHi, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md }}>
                <Txt v="caption" c={color.muted}>{k === 'home' ? '1' : k === 'draw' ? 'X' : '2'}</Txt>
                <Text style={{ fontFamily: font.display, fontSize: 14, color: p[k]?.avg ? color.accent : color.faint }}>{odds(p[k]?.avg)}</Text>
              </View>
            ))}
          </Row>
        ) : (
          <Txt v="small" c={color.faint}>{fixture.markets ? 'Prices are out of date' : 'No odds available yet'}</Txt>
        )
      ) : null}
    </Card>
  );
}

/* --------------------------------------------------------------- selections */

export function PriceButton({
  label,
  price,
  result,
  picked,
  onPress,
  wide,
}: {
  label: string;
  price: DisplayPrice | null;
  result?: Selection['result'];
  picked?: boolean;
  onPress?: () => void;
  wide?: boolean;
}) {
  const disabled = !price || !onPress || Boolean(result);
  const tint = result === 'won' ? color.accent : result === 'lost' ? color.danger : result === 'void' ? color.muted : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${price ? `odds ${odds(price.decimal)}` : 'unavailable'}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        buzz();
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexGrow: wide ? 0 : 1,
        flexBasis: wide ? 'auto' : '30%',
        minHeight: wide ? 46 : 52,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        backgroundColor: picked ? color.accentDim : color.surfaceHi,
        borderWidth: 1,
        borderColor: picked ? 'rgba(182,245,66,0.45)' : color.line,
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Txt v="small" c={color.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Txt>
      <Row gap={6}>
        {picked ? <Icon name="checkmark-circle" size={14} c={color.accent} /> : null}
        {tint ? (
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: tint }}>{result?.toUpperCase()}</Text>
        ) : (
          <Text style={{ fontFamily: font.display, fontSize: 16, color: price ? color.accent : color.faint }}>{price ? odds(price.decimal) : '—'}</Text>
        )}
      </Row>
    </Pressable>
  );
}

export const marketTitle = (m: Market, fixture: Fixture) =>
  m.market_key === 'team_total_goals'
    ? `${m.side === 'home' ? fixture.home.name : fixture.away.name} goals ${m.line}`
    : m.line != null && m.scope === 'match'
      ? `${m.name} ${m.line}`
      : m.name;

/* ----------------------------------------------------------------- bet slip */

export interface SlipTarget {
  fixture: Fixture;
  market: Market;
  selection: Selection;
}

const QUICK = [10, 25, 50, 100];

/** Review a price, choose a stake, confirm. The server prices and validates; this only previews. */
export function BetSlip({
  target,
  price,
  staleMinutes,
  balance,
  onClose,
}: {
  target: SlipTarget;
  price: DisplayPrice | null;
  staleMinutes: number;
  balance: number | null;
  onClose: () => void;
}) {
  const [stake, setStake] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestId] = useState(uuid);
  const [showBooks, setShowBooks] = useState(false);
  const now = useNow();
  const { fixture, market, selection } = target;
  const amount = Number(stake);
  const error = stake === '' ? null : stakeError(amount, balance ?? 0);
  const valid = price !== null && stake !== '' && !error;
  const title = selection.player ? `${selection.player.name} · ${market.name}${market.line != null ? ` ${selection.label}` : ''}` : `${selection.label}`;
  const staleMs = staleMinutes * 60_000;

  const submit = async () => {
    if (!price) return;
    setBusy(true);
    setNotice(null);
    try {
      await call('place_prediction', { p_selection_id: selection.id, p_stake: amount, p_request_id: requestId, p_expected_odds: price.decimal });
      buzz('success');
      toast(`Prediction placed: ${coins(amount)} coins at ${odds(price.decimal)}.`);
      invalidate('my_wallet', 'my_predictions', 'get_fixture', 'get_rankings');
      onClose();
    } catch (e) {
      const err = e as ApiError;
      buzz('error');
      if (err.code === 'ODDS_CHANGED') {
        setNotice(`The price moved to ${odds(Number(err.detail))}. Check it and confirm again.`);
        invalidate('get_fixture_markets');
      } else if (err.code === 'AGE_NOT_CONFIRMED') {
        onClose();
        router.push('/age');
      } else {
        setNotice(err.message);
        if (err.code === 'ODDS_UNAVAILABLE' || err.code === 'MARKET_LOCKED') invalidate('get_fixture_markets', 'get_fixture');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={title}>
      <Txt v="small" c={color.muted} style={{ marginTop: -space.md }}>
        {market.scope === 'player' ? '' : `${marketTitle(market, fixture)} · `}
        {fixture.home.name} v {fixture.away.name} · {formatDay(fixture.kickoff_at)} {formatTime(fixture.kickoff_at)}
      </Txt>

      {price ? (
        <Card tone="raised">
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Txt v="caption" c={color.muted}>Odds you lock in</Txt>
              <Text style={{ fontFamily: font.displayHeavy, fontSize: 40, lineHeight: 44, color: color.accent }}>{odds(price.decimal)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
              <Txt v="small" style={{ textAlign: 'right' }}>{price.source}</Txt>
              <Txt v="small" c={color.muted} style={{ textAlign: 'right' }}>
                Implied chance {(impliedProbability(price.decimal) * 100).toFixed(0)}% incl. margin
              </Txt>
            </View>
          </Row>
          <Pressable accessibilityRole="button" onPress={() => setShowBooks(!showBooks)} hitSlop={8}>
            <Row gap={6}>
              <Txt v="small" c={color.muted} style={{ flex: 1 }}>
                {price.summary.lastUpdate ? `Feed checked ${ago(price.summary.lastUpdate, now)}` : ''} · {price.summary.total} bookmaker{price.summary.total === 1 ? '' : 's'}
              </Txt>
              <Icon name={showBooks ? 'chevron-up' : 'chevron-down'} size={16} c={color.muted} />
            </Row>
          </Pressable>
          {showBooks ? (
            <ScrollView style={{ maxHeight: 150 }}>
              {selection.quotes.map((q) => {
                const stale = !q.suspended && (!q.fresh || now - q.updatedAt > staleMs);
                const best = !stale && price.summary.best?.bookmakerKey === q.bookmakerKey;
                return (
                  <Row key={q.bookmakerKey} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.line }}>
                    <Txt v="small" style={{ flex: 1 }} c={q.suspended || stale ? color.faint : color.text}>{q.bookmaker}</Txt>
                    {q.suspended ? <Pill label="SUSPENDED" tone="danger" /> : q.withdrawn ? <Pill label="WITHDRAWN" tone="danger" /> : stale ? <Pill label="STALE" tone="warn" /> : best ? <Pill label="BEST" tone="accent" /> : null}
                    <Txt v="num" c={q.suspended || stale ? color.faint : color.text} style={{ width: 52, textAlign: 'right', fontSize: 15 }}>{odds(q.decimal)}</Txt>
                  </Row>
                );
              })}
              <Txt v="small" c={color.faint} style={{ paddingTop: 6 }}>
                {selection.quotes[0]?.bookmaker_updated_at ? `Bookmaker update: ${formatStamp(Math.max(...selection.quotes.map((q) => q.bookmaker_updated_at ?? 0)))} (Madrid). ` : ''}
                Source: {[...new Set(selection.quotes.map((q) => q.provider))].join(', ')}.
              </Txt>
            </ScrollView>
          ) : null}
        </Card>
      ) : (
        <Notice tone="danger" icon="alert-circle" text="There is no current price for this selection from your reference. It cannot be predicted right now." />
      )}

      <Field
        label={`Stake · ${balance == null ? '…' : coins(balance)} coins available`}
        placeholder="0"
        keyboardType="number-pad"
        value={stake}
        onChangeText={(t) => setStake(t.replace(/[^0-9]/g, '').slice(0, 5))}
        error={error}
        icon="ellipse"
      />
      <Row gap={space.sm}>
        {QUICK.map((q) => (
          <Chip key={q} label={`${q}`} active={amount === q} onPress={() => setStake(String(q))} />
        ))}
        <Chip label="Max" active={balance != null && amount === balance && amount > 0} onPress={() => setStake(String(balance ?? 0))} />
      </Row>

      <Row>
        <View style={{ flex: 1 }}>
          <Txt v="caption" c={color.muted}>Total return if correct</Txt>
          <Txt v="h2">{valid && price ? coins(totalReturn(amount, price.decimal)) : '—'}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="caption" c={color.muted}>Net profit</Txt>
          <Txt v="h2" c={color.accent}>{valid && price ? `+${coins(netProfit(amount, price.decimal))}` : '—'}</Txt>
        </View>
      </Row>

      {notice ? <Notice tone="warn" icon="alert-circle" text={notice} /> : null}
      <Button label={valid ? `Confirm · ${coins(amount)} coins` : 'Enter a stake'} icon="checkmark" disabled={!valid} loading={busy} onPress={submit} />
      <Txt v="small" c={color.faint} center>
        Virtual coins only: no cash value, nothing to buy or withdraw. Locks at kick-off; the odds shown are frozen when you confirm.
      </Txt>
    </Sheet>
  );
}

/* ------------------------------------------------------------- predictions */

const STATUS_TONE: Record<PredictionStatus, 'info' | 'accent' | 'danger' | 'muted'> = { open: 'info', won: 'accent', lost: 'danger', void: 'muted' };

export function PredictionStatusPill({ status }: { status: PredictionStatus }) {
  return <Pill label={status.toUpperCase()} tone={STATUS_TONE[status]} />;
}
