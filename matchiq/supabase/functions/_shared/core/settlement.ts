import { MARKETS_BY_KEY } from './markets.ts';
import type { FixtureFacts, GoalEvent, Outcome, SelectionRef } from './types.ts';

/**
 * Settlement rules are configuration (stored in `app_config.settlement_rules`),
 * so they can be changed without touching the engine.
 */
export interface SettlementRules {
  /** A postponed match not played this many hours after its original kick-off is void. */
  voidPostponedAfterHours: number;
  /** Player markets are void when the player took no part in the match. */
  voidIfPlayerDidNotPlay: boolean;
  /** First-scorer picks are void when the player came on after the first goal. */
  voidFirstScorerIfEnteredAfterFirstGoal: boolean;
  /**
   * Shots, fouls, tackles and saves come from whole-match statistics that
   * cannot be cut at 90 minutes, so they are void when a match goes to extra time.
   */
  voidStatMarketsOnExtraTime: boolean;
  /** Give up waiting for provider statistics after this many hours and void. */
  voidIfDataMissingAfterHours: number;
}

export const DEFAULT_SETTLEMENT_RULES: SettlementRules = {
  voidPostponedAfterHours: 48,
  voidIfPlayerDidNotPlay: true,
  voidFirstScorerIfEnteredAfterFirstGoal: true,
  voidStatMarketsOnExtraTime: true,
  voidIfDataMissingAfterHours: 72,
};

export interface Settlement {
  /** null = cannot be settled yet (match not finished, data not published). */
  outcome: Outcome | null;
  reason: string;
}

const done = (outcome: Outcome, reason: string): Settlement => ({ outcome, reason });
const wait = (reason: string): Settlement => ({ outcome: null, reason });
const win = (cond: boolean, reason: string) => done(cond ? 'won' : 'lost', reason);
const HOUR = 3_600_000;

const sign = (h: number, a: number) => (h > a ? 'home' : h < a ? 'away' : 'draw');

/** Over/under against a line; landing exactly on a whole-number line is a push (void). */
function overUnder(key: string, value: number, line: number | null, what: string): Settlement {
  if (line == null) return done('void', 'Market has no line');
  if (value === line) return done('void', `${what} ${value} equals the line ${line}`);
  const over = value > line;
  return win(key === 'over' ? over : !over, `${what} ${value} vs line ${line}`);
}

/**
 * Decides one selection from official match facts. Pure and deterministic:
 * the same facts always produce the same outcome, which is what makes
 * settlement idempotent and auditable.
 *
 * All match markets are settled on regulation time (90 minutes + stoppage).
 */
export function settleSelection(
  sel: SelectionRef,
  facts: FixtureFacts,
  rules: SettlementRules = DEFAULT_SETTLEMENT_RULES,
  now: number = Date.now()
): Settlement {
  const def = MARKETS_BY_KEY[sel.marketKey];
  if (!def) return done('void', `Unknown market ${sel.marketKey}`);

  switch (facts.status) {
    case 'cancelled':
    case 'abandoned':
    case 'awarded':
      return done('void', `Match ${facts.status}`);
    case 'postponed':
      return now - facts.kickoffAt > rules.voidPostponedAfterHours * HOUR
        ? done('void', `Postponed and not played within ${rules.voidPostponedAfterHours}h`)
        : wait('Match postponed');
    case 'finished':
      break;
    default:
      return wait('Match not finished');
  }

  const giveUp = now - facts.kickoffAt > rules.voidIfDataMissingAfterHours * HOUR;
  const missing = (what: string) =>
    giveUp ? done('void', `${what} not published within ${rules.voidIfDataMissingAfterHours}h`) : wait(`Waiting for ${what}`);

  const { ftHome: h, ftAway: a, htHome: hh, htAway: ha } = facts;
  if (h == null || a == null) return missing('final score');

  /* ------------------------------------------------------------ score markets */
  switch (sel.marketKey) {
    case 'match_result':
      return win(sign(h, a) === sel.key, `Full time ${h}-${a}`);
    case 'double_chance':
      return win(sel.key.split('_').includes(sign(h, a)), `Full time ${h}-${a}`);
    case 'draw_no_bet':
      return h === a ? done('void', `Draw ${h}-${a}`) : win(sign(h, a) === sel.key, `Full time ${h}-${a}`);
    case 'btts':
      return win((h > 0 && a > 0) === (sel.key === 'yes'), `Full time ${h}-${a}`);
    case 'total_goals':
      return overUnder(sel.key, h + a, sel.line, 'Total goals');
    case 'team_total_goals':
      if (!sel.side) return done('void', 'Team total without a team');
      return overUnder(sel.key, sel.side === 'home' ? h : a, sel.line, `${sel.side} goals`);
    case 'correct_score':
      return win(sel.key === `${h}-${a}`, `Full time ${h}-${a}`);
    case 'half_time_result':
      if (hh == null || ha == null) return missing('half-time score');
      return win(sign(hh, ha) === sel.key, `Half time ${hh}-${ha}`);
    case 'ht_ft':
      if (hh == null || ha == null) return missing('half-time score');
      return win(sel.key === `${sign(hh, ha)}_${sign(h, a)}`, `HT ${hh}-${ha}, FT ${h}-${a}`);
  }

  /* ------------------------------------------------------------ event markets */
  const goals = facts.goals.filter((g) => g.period === 'regular').sort((x, y) => x.seq - y.seq);
  const needsEvents = def.needs.includes('events');
  if (needsEvents) {
    if (!facts.eventsFinal) return missing('match events');
    // Events must reproduce the official score, otherwise the feed is incomplete.
    const home = goals.filter((g) => g.side === 'home').length;
    if (home !== h || goals.length - home !== a) return missing('complete goal events');
  }

  if (sel.marketKey === 'first_team_to_score' || sel.marketKey === 'last_team_to_score') {
    const goal = sel.marketKey === 'first_team_to_score' ? goals[0] : goals[goals.length - 1];
    return win((goal?.side ?? 'none') === sel.key, goal ? `Goal at ${goal.minute}' for ${goal.side}` : 'No goals');
  }

  /* ----------------------------------------------------------- player markets */
  if (def.scope !== 'player') return done('void', `No settlement rule for ${sel.marketKey}`);
  const pid = sel.playerId;
  if (!pid) return done('void', 'Player could not be identified');

  if (sel.marketKey === 'player_to_start') {
    if (!Object.keys(facts.players).length) return missing('lineups');
    return win(Boolean(facts.players[pid]?.started) === (sel.key === 'yes'), 'Official lineup');
  }

  if (!facts.playerStatsFinal) return missing('player statistics');
  const stats = facts.players[pid];
  const played = Boolean(stats && (stats.minutes ?? 0) > 0);
  if (!played && rules.voidIfPlayerDidNotPlay) return done('void', 'Player did not play');

  // Own goals never count for a scorer market.
  const credited: GoalEvent[] = goals.filter((g) => !g.ownGoal);
  if (needsEvents && credited.some((g) => g.playerId == null)) return missing('goalscorer identification');
  const scored = credited.filter((g) => g.playerId === pid).length;
  const assisted = credited.filter((g) => g.assistId === pid).length;

  switch (sel.marketKey) {
    case 'player_anytime_scorer':
      return win(scored >= 1, `${scored} goal(s)`);
    case 'player_2plus_goals':
      return win(scored >= 2, `${scored} goal(s)`);
    case 'player_3plus_goals':
      return win(scored >= 3, `${scored} goal(s)`);
    case 'player_assist':
      return win(assisted >= 1, `${assisted} assist(s)`);
    case 'player_2plus_assists':
      return win(assisted >= 2, `${assisted} assist(s)`);
    case 'player_score_or_assist':
      return win(scored + assisted >= 1, `${scored} goal(s), ${assisted} assist(s)`);
    case 'player_first_scorer': {
      const first = credited[0];
      if (
        first &&
        rules.voidFirstScorerIfEnteredAfterFirstGoal &&
        stats?.enteredMinute != null &&
        stats.enteredMinute > first.minute
      ) {
        return done('void', `Came on at ${stats.enteredMinute}' after the first goal (${first.minute}')`);
      }
      return win(first?.playerId === pid, first ? `First goal at ${first.minute}'` : 'No goalscorer');
    }
    case 'player_last_scorer': {
      const last = credited[credited.length - 1];
      return win(last?.playerId === pid, last ? `Last goal at ${last.minute}'` : 'No goalscorer');
    }
    case 'player_card':
    case 'player_red_card': {
      const cards = facts.cards.filter((c) => c.period === 'regular' && c.playerId === pid);
      const reds = cards.filter((c) => c.card !== 'yellow').length;
      return sel.marketKey === 'player_card' ? win(cards.length >= 1, `${cards.length} card(s)`) : win(reds >= 1, `${reds} red card(s)`);
    }
  }

  /* ------------------------------------------------ whole-match stat markets */
  const statOf: Record<string, [number | null | undefined, string]> = {
    player_shots: [stats?.shots, 'Shots'],
    player_shots_on_target: [stats?.shotsOnTarget, 'Shots on target'],
    player_fouls: [stats?.foulsCommitted, 'Fouls'],
    player_tackles: [stats?.tackles, 'Tackles'],
    goalkeeper_saves: [stats?.saves, 'Saves'],
  };
  const entry = statOf[sel.marketKey];
  if (!entry) return done('void', `No settlement rule for ${sel.marketKey}`);
  if (facts.wentToExtraTime && rules.voidStatMarketsOnExtraTime) {
    return done('void', 'Match went to extra time; statistic cannot be cut at 90 minutes');
  }
  const [value, label] = entry;
  // A player who played but has no value recorded did nothing countable: providers send null for zero.
  return overUnder(sel.key, value ?? 0, sel.line, label);
}
