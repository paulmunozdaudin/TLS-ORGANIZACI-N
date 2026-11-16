/**
 * Market registry. A market exists in the product only if (a) it is defined
 * here with a settlement rule and (b) a provider actually delivers prices for
 * it on a given fixture. Nothing in this file creates odds.
 *
 * The same list seeds the `markets` table (see the migration), where a
 * market can be switched off without a deploy.
 */

export type MarketScope = 'match' | 'player';
export type MarketGroup = 'result' | 'goals' | 'halves' | 'scorers' | 'assists' | 'shots' | 'cards' | 'other';

/** What official data a market needs before it can be settled. */
export type SettlementNeed = 'score' | 'halftime' | 'events' | 'player_stats' | 'lineups';

export interface MarketDef {
  key: string;
  name: string;
  group: MarketGroup;
  scope: MarketScope;
  /** True when selections are over/under a numeric line. */
  hasLine: boolean;
  needs: SettlementNeed[];
  /** Fixed selection keys, when the market has a closed set. */
  selections?: string[];
  sort: number;
}

const m = (
  sort: number,
  key: string,
  name: string,
  group: MarketGroup,
  scope: MarketScope,
  needs: SettlementNeed[],
  opts: { hasLine?: boolean; selections?: string[] } = {}
): MarketDef => ({ key, name, group, scope, needs, hasLine: Boolean(opts.hasLine), selections: opts.selections, sort });

const HDA = ['home', 'draw', 'away'];
const OU = ['over', 'under'];
const YN = ['yes', 'no'];

export const MARKETS: MarketDef[] = [
  m(10, 'match_result', 'Match result', 'result', 'match', ['score'], { selections: HDA }),
  m(20, 'double_chance', 'Double chance', 'result', 'match', ['score'], { selections: ['home_draw', 'home_away', 'draw_away'] }),
  m(30, 'draw_no_bet', 'Draw no bet', 'result', 'match', ['score'], { selections: ['home', 'away'] }),
  m(40, 'btts', 'Both teams to score', 'goals', 'match', ['score'], { selections: YN }),
  m(50, 'total_goals', 'Total goals', 'goals', 'match', ['score'], { hasLine: true, selections: OU }),
  m(60, 'team_total_goals', 'Team total goals', 'goals', 'match', ['score'], { hasLine: true, selections: OU }),
  m(70, 'correct_score', 'Correct score', 'goals', 'match', ['score']),
  m(80, 'half_time_result', 'Half-time result', 'halves', 'match', ['halftime'], { selections: HDA }),
  m(90, 'ht_ft', 'Half-time / full-time', 'halves', 'match', ['halftime', 'score']),
  m(100, 'first_team_to_score', 'First team to score', 'goals', 'match', ['events'], { selections: ['home', 'away', 'none'] }),
  m(110, 'last_team_to_score', 'Last team to score', 'goals', 'match', ['events'], { selections: ['home', 'away', 'none'] }),

  m(200, 'player_anytime_scorer', 'Anytime goalscorer', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(210, 'player_first_scorer', 'First goalscorer', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(220, 'player_last_scorer', 'Last goalscorer', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(230, 'player_2plus_goals', 'To score 2 or more', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(240, 'player_3plus_goals', 'To score a hat-trick', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(250, 'player_score_or_assist', 'To score or assist', 'scorers', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(300, 'player_assist', 'To assist', 'assists', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(310, 'player_2plus_assists', 'To assist 2 or more', 'assists', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(400, 'player_shots', 'Shots', 'shots', 'player', ['player_stats'], { hasLine: true, selections: OU }),
  m(410, 'player_shots_on_target', 'Shots on target', 'shots', 'player', ['player_stats'], { hasLine: true, selections: OU }),
  m(500, 'player_card', 'To be carded', 'cards', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(510, 'player_red_card', 'To be sent off', 'cards', 'player', ['events', 'player_stats'], { selections: ['yes'] }),
  m(600, 'player_fouls', 'Fouls committed', 'other', 'player', ['player_stats'], { hasLine: true, selections: OU }),
  m(610, 'player_tackles', 'Tackles', 'other', 'player', ['player_stats'], { hasLine: true, selections: OU }),
  m(620, 'goalkeeper_saves', 'Goalkeeper saves', 'other', 'player', ['player_stats'], { hasLine: true, selections: OU }),
  m(630, 'player_to_start', 'To start', 'other', 'player', ['lineups'], { selections: YN }),
];

export const MARKETS_BY_KEY: Record<string, MarketDef> = Object.fromEntries(MARKETS.map((d) => [d.key, d]));

export const MARKET_GROUP_LABEL: Record<MarketGroup, string> = {
  result: 'Result',
  goals: 'Goals',
  halves: 'Halves',
  scorers: 'Goalscorers',
  assists: 'Assists',
  shots: 'Shots',
  cards: 'Cards',
  other: 'More',
};

/** Human label for a selection, built from data only. */
export function selectionLabel(
  marketKey: string,
  key: string,
  ctx: { home: string; away: string; line?: number | null; player?: string | null; side?: 'home' | 'away' | null }
): string {
  const team = (k: string) => (k === 'home' ? ctx.home : k === 'away' ? ctx.away : k === 'draw' ? 'Draw' : k === 'none' ? 'No goal' : k);
  const line = ctx.line != null ? ` ${ctx.line}` : '';
  switch (marketKey) {
    case 'match_result':
    case 'half_time_result':
    case 'draw_no_bet':
    case 'first_team_to_score':
    case 'last_team_to_score':
      return team(key);
    case 'double_chance':
      return key.split('_').map(team).join(' or ');
    case 'ht_ft':
      return key.split('_').map(team).join(' / ');
    case 'btts':
    case 'player_to_start':
      return key === 'yes' ? 'Yes' : 'No';
    case 'correct_score':
      return key.replace('-', ' – ');
    case 'team_total_goals':
      return `${team(ctx.side ?? '')} ${key === 'over' ? 'over' : 'under'}${line}`;
    default:
      if (key === 'over' || key === 'under') return `${key === 'over' ? 'Over' : 'Under'}${line}`;
      return ctx.player ?? (key === 'yes' ? 'Yes' : key);
  }
}
