import type { GameRules } from './rules';
import type { Bid, Player, Position, Result, Team } from './types';
import { fail, ok } from './types';

export function squadCount(team: Team, players: Record<string, Player>, position: Position) {
  return team.squad.filter((s) => players[s.playerId]?.position === position).length;
}

/** Budget not yet committed to open bids. A manager can never bid past it. */
export function availableBudget(team: Team, openBids: Bid[]): number {
  const committed = openBids
    .filter((b) => b.managerId === team.managerId && b.leagueId === team.leagueId && b.status === 'open')
    .reduce((s, b) => s + b.amount, 0);
  return team.budget - committed;
}

export interface BidRequest {
  team: Team;
  player: Player | undefined;
  amount: number;
  /** Open bids of the league in the current round. */
  openBids: Bid[];
  /** Player ids already owned by anyone in the league. */
  ownedIds: Set<string>;
  players: Record<string, Player>;
  rules: GameRules;
}

/** All checks a bid must pass. Mirrors what the server enforces. */
export function validateBid(req: BidRequest): Result {
  const { team, player, amount, openBids, ownedIds, players, rules } = req;
  if (!player) return fail('This player does not exist.');
  if (ownedIds.has(player.id)) return fail(`${player.name} already belongs to a manager in this league.`);
  if (!Number.isInteger(amount) || amount <= 0) return fail('Enter a whole amount in €M.');
  if (amount < player.price) return fail(`The minimum bid for ${player.name} is €${player.price}M.`);

  const mine = openBids.filter((b) => b.managerId === team.managerId && b.status === 'open');
  const existing = mine.find((b) => b.playerId === player.id);
  const free = availableBudget(team, openBids) + (existing?.amount ?? 0);
  if (amount > free) return fail(`You only have €${free}M available for this bid.`);

  // Squad room, counting players you are already bidding on.
  const pendingIds = mine.filter((b) => b.playerId !== player.id).map((b) => b.playerId);
  if (team.squad.length + pendingIds.length >= rules.squadSize) {
    return fail(`Your squad and open bids already fill all ${rules.squadSize} slots.`);
  }
  const samePos =
    squadCount(team, players, player.position) +
    pendingIds.filter((id) => players[id]?.position === player.position).length;
  if (samePos >= rules.squadLimits[player.position]) {
    return fail(`You cannot hold more than ${rules.squadLimits[player.position]} ${player.position}.`);
  }
  return ok(undefined);
}

export interface RoundOutcome {
  bids: Bid[];
  teams: Team[];
  signings: { managerId: string; playerId: string; amount: number }[];
}

/**
 * Resolves a blind-auction round atomically.
 *
 * Players are settled from the most contested price downwards. For each
 * player the highest bid wins; ties go to the earliest bid. A winning bid is
 * re-validated against the manager's *current* budget and squad room, so no
 * sequence of wins can ever overspend or overfill a squad. Bids that fail the
 * re-check are voided and the next highest bid is considered.
 *
 * Inputs are not mutated. Re-running on an already resolved round is a no-op
 * because only `open` bids are considered.
 */
export function resolveRound(
  bids: Bid[],
  teams: Team[],
  players: Record<string, Player>,
  rules: GameRules
): RoundOutcome {
  const nextTeams = new Map(teams.map((t) => [t.managerId, { ...t, squad: [...t.squad] }]));
  const nextBids = bids.map((b) => ({ ...b }));
  const open = nextBids.filter((b) => b.status === 'open');
  const owned = new Set(teams.flatMap((t) => t.squad.map((s) => s.playerId)));
  const signings: RoundOutcome['signings'] = [];

  const byPlayer = new Map<string, Bid[]>();
  for (const b of open) byPlayer.set(b.playerId, [...(byPlayer.get(b.playerId) ?? []), b]);
  const rank = (a: Bid, b: Bid) => b.amount - a.amount || a.placedAt - b.placedAt || a.id.localeCompare(b.id);
  const groups = [...byPlayer.values()].map((g) => g.sort(rank)).sort((a, b) => rank(a[0], b[0]));

  for (const group of groups) {
    let sold = false;
    for (const bid of group) {
      const team = nextTeams.get(bid.managerId);
      const player = players[bid.playerId];
      if (sold) {
        bid.status = 'lost';
        continue;
      }
      const canSign =
        team &&
        player &&
        !owned.has(player.id) &&
        bid.amount <= team.budget &&
        team.squad.length < rules.squadSize &&
        squadCount(team, players, player.position) < rules.squadLimits[player.position];
      if (!canSign) {
        bid.status = 'void';
        continue;
      }
      team.budget -= bid.amount;
      team.squad.push({ playerId: player.id, paid: bid.amount });
      owned.add(player.id);
      bid.status = 'won';
      sold = true;
      signings.push({ managerId: bid.managerId, playerId: player.id, amount: bid.amount });
    }
  }
  return { bids: nextBids, teams: [...nextTeams.values()], signings };
}

export function sellRefund(paid: number, rules: GameRules): number {
  return Math.floor(paid * rules.sellRefundRate);
}
