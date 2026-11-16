import { toMilli } from './odds.ts';
import type { Outcome } from './types.ts';

/**
 * Virtual bankroll arithmetic. Coins are whole numbers and have no monetary
 * value. These functions mirror the SQL in `place_prediction` and
 * `settle_selection`; the database result is the one that counts, the client
 * only uses them to preview.
 */

export const SEASON_COINS = 1000;
export const MIN_STAKE = 1;

/** Total coins returned by a winning prediction: round(stake × odds). */
export function totalReturn(stake: number, decimalOdds: number): number {
  return Math.floor((stake * toMilli(decimalOdds) + 500) / 1000);
}

export const netProfit = (stake: number, decimalOdds: number) => totalReturn(stake, decimalOdds) - stake;

/** Coins credited to the wallet when a prediction settles. */
export function payoutFor(outcome: Outcome, stake: number, lockedOdds: number): number {
  if (outcome === 'won') return totalReturn(stake, lockedOdds);
  if (outcome === 'void') return stake;
  return 0;
}

export function stakeError(stake: number, balance: number): string | null {
  if (!Number.isInteger(stake)) return 'Stakes are whole coins.';
  if (stake < MIN_STAKE) return `The minimum stake is ${MIN_STAKE} coin.`;
  if (stake > balance) return `You only have ${balance} coins available.`;
  return null;
}

export interface WalletTotals {
  balance: number;
  openStakes: number;
  totalStaked: number;
  totalReturned: number;
}

export interface WalletSummary extends WalletTotals {
  /** Balance plus stakes still in play: what the season is worth right now. */
  equity: number;
  /** Returns minus stakes on settled predictions. */
  netProfit: number;
  /** Net profit divided by settled stakes, or null before anything has settled. */
  roi: number | null;
}

export function summarizeWallet(w: WalletTotals): WalletSummary {
  const settledStakes = w.totalStaked - w.openStakes;
  const net = w.totalReturned - settledStakes;
  return {
    ...w,
    equity: w.balance + w.openStakes,
    netProfit: net,
    roi: settledStakes > 0 ? net / settledStakes : null,
  };
}
