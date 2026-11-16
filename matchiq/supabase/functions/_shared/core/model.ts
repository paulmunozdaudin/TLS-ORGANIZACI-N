/**
 * Statistical context layer. Separate from odds on purpose: these are
 * estimates from historical scoring rates, shown as "model estimate" and
 * never as a price, a tip or a guarantee.
 *
 * Method: independent Poisson goal model. Each side's expected goals is
 * league average × attack strength × opponent defence weakness, with
 * strengths taken from home/away scoring rates. Simple, transparent, and
 * known to under-rate draws and low scores; `brierScore`/`logLoss` exist so
 * it is measured against real results before anyone relies on it.
 */

export interface TeamRates {
  /** Matches the rates are based on. */
  played: number;
  scoredPerGame: number;
  concededPerGame: number;
}

export interface ModelInput {
  /** Home side's record in home matches. */
  home: TeamRates;
  /** Away side's record in away matches. */
  away: TeamRates;
  /** Competition averages per match for home sides and away sides. */
  leagueHomeGoals: number;
  leagueAwayGoals: number;
}

export interface MatchModel {
  lambdaHome: number;
  lambdaAway: number;
  home: number;
  draw: number;
  away: number;
  btts: number;
  /** Probability of more than `line` total goals. */
  over: (line: number) => number;
  /** P(home = i, away = j), indices 0..MAX_GOALS. */
  matrix: number[][];
  /** Smallest sample behind the estimate; small samples mean wide uncertainty. */
  sample: number;
}

export const MAX_GOALS = 10;
export const MIN_SAMPLE = 5;

export function poisson(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/** Returns null when there is not enough history to say anything. */
export function matchModel(input: ModelInput): MatchModel | null {
  const { home, away, leagueHomeGoals, leagueAwayGoals } = input;
  if (home.played < MIN_SAMPLE || away.played < MIN_SAMPLE || leagueHomeGoals <= 0 || leagueAwayGoals <= 0) return null;

  const lambdaHome = leagueHomeGoals * (home.scoredPerGame / leagueHomeGoals) * (away.concededPerGame / leagueHomeGoals);
  const lambdaAway = leagueAwayGoals * (away.scoredPerGame / leagueAwayGoals) * (home.concededPerGame / leagueAwayGoals);

  const ph = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poisson(k, lambdaHome));
  const pa = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poisson(k, lambdaAway));
  const matrix = ph.map((x) => pa.map((y) => x * y));
  const mass = matrix.flat().reduce((s, p) => s + p, 0);

  let h = 0;
  let d = 0;
  let a = 0;
  let btts = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = matrix[i][j] / mass;
      matrix[i][j] = p;
      if (i > j) h += p;
      else if (i === j) d += p;
      else a += p;
      if (i > 0 && j > 0) btts += p;
    }
  }
  return {
    lambdaHome,
    lambdaAway,
    home: h,
    draw: d,
    away: a,
    btts,
    matrix,
    sample: Math.min(home.played, away.played),
    over: (line) => {
      let p = 0;
      for (let i = 0; i <= MAX_GOALS; i++) for (let j = 0; j <= MAX_GOALS; j++) if (i + j > line) p += matrix[i][j];
      return p;
    },
  };
}

/** Share of a player's appearances in which an event happened. null without history. */
export function historicalRate(occurrences: number, appearances: number): number | null {
  return appearances >= MIN_SAMPLE ? occurrences / appearances : null;
}

/** Model probability minus the market's margin-free probability. Not a recommendation. */
export const probabilityGap = (model: number, market: number) => model - market;

/* ------------------------------------------------------------- evaluation */

export interface Forecast {
  /** Probabilities for each outcome, summing to 1. */
  probs: number[];
  /** Index of the outcome that happened. */
  actual: number;
}

/** Multi-class Brier score: 0 is perfect, lower is better. */
export function brierScore(forecasts: Forecast[]): number {
  if (!forecasts.length) return NaN;
  const total = forecasts.reduce(
    (s, f) => s + f.probs.reduce((t, p, i) => t + (p - (i === f.actual ? 1 : 0)) ** 2, 0),
    0
  );
  return total / forecasts.length;
}

/** Mean negative log-likelihood: lower is better. */
export function logLoss(forecasts: Forecast[]): number {
  if (!forecasts.length) return NaN;
  return -forecasts.reduce((s, f) => s + Math.log(Math.max(f.probs[f.actual], 1e-12)), 0) / forecasts.length;
}
