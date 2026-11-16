import { useMemo } from 'react';

import { availableBudget } from '@/domain/market';

import { findTeam, leagueStandings, myLeagues } from './game';
import { useGameState } from './store';

/** Everything a screen usually needs about the signed-in manager's active league. */
export function useActiveLeague() {
  const s = useGameState();
  return useMemo(() => {
    const leagues = myLeagues(s);
    const league = leagues.find((l) => l.id === s.activeLeagueId) ?? leagues[0] ?? null;
    const team = league ? findTeam(s, league.id, s.meId) ?? null : null;
    const openBids = league ? s.bids.filter((b) => b.leagueId === league.id && b.status === 'open') : [];
    const myBids = openBids.filter((b) => b.managerId === s.meId);
    const standings = league && league.status !== 'lobby' ? leagueStandings(s, league) : [];
    return {
      s,
      me: s.meId ? s.managers[s.meId] : undefined,
      leagues,
      league,
      team,
      myBids,
      committed: myBids.reduce((sum, b) => sum + b.amount, 0),
      available: team ? availableBudget(team, openBids) : 0,
      standings,
      rank: standings.findIndex((r) => r.managerId === s.meId) + 1,
    };
  }, [s]);
}
