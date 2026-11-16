// Database tests: apply the real migrations to a scratch Postgres and drive
// the RPCs the way Supabase clients and Edge Functions do.
//
//   DATABASE_URL=postgres://user:pass@127.0.0.1:5432/matchiq_test npm run test:db
//
// The database is wiped on every run. Football rows created here are test
// fixtures with obviously synthetic names; they exist only in this database.
import assert from 'node:assert/strict';
import pg from 'pg';

import { resetDatabase } from './bootstrap.mjs';

import { MARKETS } from '../functions/_shared/core/markets.ts';
import { settleSelection } from '../functions/_shared/core/settlement.ts';
import { JOBS, runJob } from '../functions/_shared/jobs.ts';
import { createApiFootball } from '../functions/_shared/providers/apiFootball.ts';
import { createTheOddsApi } from '../functions/_shared/providers/theOddsApi.ts';

const url = process.env.DATABASE_URL ?? 'postgres://matchiq_test:matchiq_test@127.0.0.1:5432/matchiq_test';
const pool = new pg.Pool({ connectionString: url, max: 6 });
const sql = (text, params) => pool.query(text, params).then((r) => r.rows);
const one = (text, params) => sql(text, params).then((r) => r[0]);

/** Runs statements as a signed-in user, the way PostgREST does. */
async function asUser(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const out = await fn((text, params) => client.query(text, params).then((r) => r.rows));
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}
const rpc = (userId, text, params) => asUser(userId, (q) => q(text, params).then((r) => r[0]));
async function code(promise) {
  try {
    await promise;
    return null;
  } catch (e) {
    return e.message;
  }
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const bootstrap = () => resetDatabase(sql);

const P = 'test-provider';
let alice, bob, carol, fixtureId, sel;

test('market registry in the database matches the TypeScript registry', async () => {
  const rows = await sql('select key, name, grp, scope, has_line, needs, sort from markets order by sort');
  assert.deepEqual(
    rows.map((r) => [r.key, r.name, r.grp, r.scope, r.has_line, r.needs, r.sort]),
    MARKETS.map((m) => [m.key, m.name, m.group, m.scope, m.hasLine, m.needs, m.sort])
  );
});

test('sign-up creates a profile; reference ingestion is idempotent on external ids', async () => {
  [alice, bob, carol] = await Promise.all(
    ['alice', 'bob', 'carol'].map((u) =>
      one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [`${u}@test.invalid`, { username: u }]).then((r) => r.id)
    )
  );
  assert.equal((await one('select username from profiles where id = $1', [alice])).username, 'alice');

  const reference = {
    provider: P,
    competitions: [{ external_id: 'L1', name: 'Test League', country: 'Testland', season: 2026 }],
    teams: [
      { external_id: 'T1', name: 'Test Home FC' },
      { external_id: 'T2', name: 'Test Away FC' },
    ],
    players: [
      { external_id: 'P9', name: 'T. Striker', team_external_id: 'T1', position: 'Attacker' },
      { external_id: 'P10', name: 'T. Playmaker', team_external_id: 'T1' },
      { external_id: 'P7', name: 'T. Winger', team_external_id: 'T2' },
    ],
    standings: [{ competition_external_id: 'L1', team_external_id: 'T1', season: 2026, position: 1, played: 10, points: 25 }],
  };
  await one('select ingest_reference($1)', [reference]);
  await one('select ingest_reference($1)', [{ ...reference, teams: [{ external_id: 'T1', name: 'Test Home' }, reference.teams[1]] }]);
  assert.equal((await one('select count(*)::int n from teams')).n, 2);
  assert.equal((await one('select count(*)::int n from players')).n, 3);
  assert.equal((await one("select name from teams where external_id = 'T1'")).name, 'Test Home');

  const kickoff = await one("select least(now() + interval '2 hours', (current_season()).ends_at - interval '1 second') as t");
  const fixtures = { provider: P, fixtures: [{ external_id: 'F1', competition_external_id: 'L1', season: 2026, home_external_id: 'T1', away_external_id: 'T2', kickoff_at: kickoff.t, status: 'scheduled' }] };
  await one('select ingest_fixtures($1)', [fixtures]);
  const again = await one('select ingest_fixtures($1) as r', [{ ...fixtures, fixtures: [...fixtures.fixtures, { external_id: 'F2', competition_external_id: 'NOPE', home_external_id: 'T1', away_external_id: 'T2', kickoff_at: kickoff.t }] }]);
  assert.deepEqual(again.r, { fixtures: 1, skipped: 1 });
  fixtureId = (await one('select id from fixtures')).id;
});

const quote = (o) => ({ fixture_id: fixtureId, market_key: 'match_result', selection_key: 'home', label: 'Test Home', bookmaker_key: 'book_a', bookmaker_name: 'Book A', decimal_odds: 2.1, source_ref: 'evt-1', provider_updated_at: new Date().toISOString(), ...o });
const ingest = (quotes) => one('select ingest_odds($1) as r', [{ provider: 'the-odds-api', quotes }]).then((x) => x.r);

test('odds ingestion creates markets from real quotes only and keeps history', async () => {
  const p9 = (await one("select id from players where external_id = 'P9'")).id;
  const first = await ingest([
    quote({}),
    quote({ bookmaker_key: 'book_b', bookmaker_name: 'Book B', decimal_odds: 2.2 }),
    quote({ bookmaker_key: 'book_c', bookmaker_name: 'Book C', decimal_odds: 2.0 }),
    quote({ selection_key: 'draw', label: 'Draw', decimal_odds: 3.4 }),
    quote({ market_key: 'total_goals', line: 2.5, selection_key: 'over', label: 'Over 2.5', decimal_odds: 1.9 }),
    quote({ market_key: 'player_anytime_scorer', selection_key: 'yes', player_id: p9, label: 'T. Striker', decimal_odds: 2.6 }),
    quote({ market_key: 'not_a_market', decimal_odds: 9 }),
    quote({ decimal_odds: 1 }),
  ]);
  assert.deepEqual(first, { new: 6, changed: 0, unchanged: 0, skipped: 2, withdrawn: 0 });
  assert.equal((await one('select count(*)::int n from fixture_markets')).n, 3);

  const second = await ingest([quote({}), quote({ bookmaker_key: 'book_b', decimal_odds: 2.3 })]);
  assert.deepEqual(second, { new: 0, changed: 1, unchanged: 1, skipped: 0, withdrawn: 0 });
  const history = await sql("select decimal_odds::float o, is_latest from odds_snapshots s join bookmakers b on b.id = s.bookmaker_id where b.key = 'book_b' order by s.id");
  assert.deepEqual(history, [{ o: 2.2, is_latest: false }, { o: 2.3, is_latest: true }]);

  sel = Object.fromEntries((await sql("select s.id, fm.market_key || ':' || s.key as k from market_selections s join fixture_markets fm on fm.id = s.fixture_market_id")).map((r) => [r.k, r.id]));
  const price = await one('select best_odds::float best, avg_odds::float avg, bookmaker_count::int n from selection_prices where selection_id = $1', [sel['match_result:home']]);
  assert.deepEqual(price, { best: 2.3, avg: 2.13, n: 3 });
});

test('clients cannot write game or football tables directly', async () => {
  const wallet = await rpc(alice, 'select * from get_wallet()');
  assert.equal(wallet.balance, 1000);
  assert.match(await code(asUser(alice, (q) => q('update virtual_wallets set balance = 999999'))), /permission denied/);
  assert.match(await code(asUser(alice, (q) => q("insert into odds_snapshots (selection_id, bookmaker_id, provider_id, decimal_odds) values (1, 1, 'the-odds-api', 50)"))), /permission denied/);
  assert.match(await code(asUser(alice, (q) => q('select settle_selection($1, $2)', [sel['match_result:home'], 'won']))), /permission denied/);
  assert.match(await code(asUser(alice, (q) => q('select adult_confirmed_at from profiles'))), /permission denied/);
});

const place = (user, selectionId, stake, requestId, expected = null) =>
  rpc(user, 'select * from place_prediction($1, $2, $3, $4)', [selectionId, stake, requestId, expected]);
const uuid = () => crypto.randomUUID();

test('placing a prediction validates, freezes the price and debits atomically', async () => {
  assert.equal(await code(place(alice, sel['match_result:home'], 100, uuid())), 'AGE_NOT_CONFIRMED');
  for (const u of [alice, bob, carol]) await rpc(u, 'select * from update_profile(p_confirm_adult => true)');
  assert.equal(await code(place(alice, sel['match_result:home'], 0, uuid())), 'INVALID_STAKE');
  assert.equal(await code(place(alice, sel['match_result:home'], 1001, uuid())), 'INSUFFICIENT_BALANCE');
  assert.equal(await code(place(alice, sel['match_result:home'], 100, uuid(), 2.5)), 'ODDS_CHANGED');
  assert.equal(await code(place(alice, 999999, 100, uuid())), 'MARKET_UNAVAILABLE');

  const req = uuid();
  const pred = await place(alice, sel['match_result:home'], 100, req, 2.13);
  assert.equal(Number(pred.locked_odds), 2.13);
  assert.equal(pred.potential_return, 213);
  assert.equal(pred.odds_mode, 'consensus');
  assert.equal(pred.price_detail.quotes.length, 3);
  // Same request id again: same prediction, no second debit.
  assert.equal((await place(alice, sel['match_result:home'], 100, req)).id, pred.id);
  const wallet = await rpc(alice, 'select * from get_wallet()');
  assert.deepEqual([wallet.balance, wallet.open_stakes, wallet.total_staked], [900, 100, 100]);

  // Later price moves never touch the stored prediction.
  await ingest([quote({ decimal_odds: 5 }), quote({ bookmaker_key: 'book_b', decimal_odds: 5 }), quote({ bookmaker_key: 'book_c', decimal_odds: 5 })]);
  assert.equal(Number((await one('select locked_odds from predictions where id = $1', [pred.id])).locked_odds), 2.13);
});

test('reference bookmaker and best-price modes price from real quotes', async () => {
  const bookA = (await one("select id from bookmakers where key = 'book_a'")).id;
  await ingest([quote({ decimal_odds: 2.1 }), quote({ bookmaker_key: 'book_b', decimal_odds: 2.3 }), quote({ bookmaker_key: 'book_c', decimal_odds: 2.0 })]);
  await rpc(bob, "select * from update_profile(p_reference_mode => 'bookmaker', p_reference_bookmaker_id => $1)", [bookA]);
  const viaBook = await place(bob, sel['match_result:home'], 50, uuid());
  assert.deepEqual([Number(viaBook.locked_odds), viaBook.bookmaker_id, viaBook.odds_snapshot_id != null], [2.1, bookA, true]);
  await rpc(bob, "select * from update_profile(p_reference_mode => 'best')");
  assert.equal(Number((await place(bob, sel['match_result:home'], 50, uuid())).locked_odds), 2.3);
  // Bob's bookmaker has no price for the draw selection's siblings: unavailable, not substituted.
  await rpc(bob, "select * from update_profile(p_reference_mode => 'bookmaker', p_reference_bookmaker_id => $1)", [(await one("select id from bookmakers where key = 'book_c'")).id]);
  assert.equal(await code(place(bob, sel['match_result:draw'], 10, uuid())), 'ODDS_UNAVAILABLE');
});

test('suspended and stale prices are unavailable', async () => {
  await ingest([quote({ market_key: 'total_goals', line: 2.5, selection_key: 'over', label: 'Over 2.5', decimal_odds: 1.9, suspended: true })]);
  assert.equal(await code(place(alice, sel['total_goals:over'], 10, uuid())), 'ODDS_UNAVAILABLE');
  await sql("update odds_snapshots set last_seen_at = now() - interval '4 hours', provider_updated_at = now() - interval '4 hours' where selection_id = $1", [sel['match_result:draw']]);
  assert.equal(await code(place(alice, sel['match_result:draw'], 10, uuid())), 'ODDS_UNAVAILABLE');
  const price = await one('select avg_odds, stale_count::int stale from selection_prices where selection_id = $1', [sel['match_result:draw']]);
  assert.deepEqual(price, { avg_odds: null, stale: 1 });
});

test('concurrent submissions cannot overspend a wallet', async () => {
  const results = await Promise.all([1, 2, 3, 4].map(() => code(place(carol, sel['match_result:home'], 400, uuid()))));
  assert.equal(results.filter((r) => r === null).length, 2);
  assert.equal(results.filter((r) => r === 'INSUFFICIENT_BALANCE').length, 2);
  const wallet = await rpc(carol, 'select * from get_wallet()');
  assert.deepEqual([wallet.balance, wallet.open_stakes], [200, 800]);
});

test('users only see their own predictions and ledger', async () => {
  const mine = await asUser(alice, (q) => q('select user_id from predictions'));
  assert.ok(mine.length > 0 && mine.every((r) => r.user_id === alice));
  assert.equal((await asUser(alice, (q) => q('select 1 from wallet_ledger where user_id <> $1', [alice]))).length, 0);
});

test('predictions lock at kick-off', async () => {
  await rpc(alice, 'select * from place_prediction($1, 20, $2)', [sel['player_anytime_scorer:yes'], uuid()]);
  await sql("update fixtures set kickoff_at = now() - interval '1 minute' where id = $1", [fixtureId]);
  assert.equal(await code(place(alice, sel['match_result:home'], 10, uuid())), 'MARKET_LOCKED');
});

async function settleFixture() {
  const facts = (await one('select fixture_facts($1) as f', [fixtureId])).f;
  const open = await sql('select * from open_selections($1)', [fixtureId]);
  const out = {};
  for (const s of open) {
    const r = settleSelection({ marketKey: s.market_key, line: s.line == null ? null : Number(s.line), side: s.side, key: s.key, playerId: s.player_id }, facts);
    out[`${s.market_key}:${s.key}`] = r.outcome;
    if (r.outcome) await one('select settle_selection($1, $2, $3)', [s.selection_id, r.outcome, r.reason]);
  }
  return out;
}

test('settlement waits for official data, then pays once', async () => {
  const live = { provider: P, fixtures: [{ external_id: 'F1', competition_external_id: 'L1', home_external_id: 'T1', away_external_id: 'T2', kickoff_at: new Date(Date.now() - 2 * 3600e3).toISOString(), status: 'live', home_goals: 1, away_goals: 0 }] };
  await one('select ingest_fixtures($1)', [live]);
  assert.deepEqual((await one('select fixtures_to_settle() as f')).f, []);

  const finished = { ...live.fixtures[0], status: 'finished', home_goals: 2, away_goals: 1, ht_home: 1, ht_away: 0, ft_home: 2, ft_away: 1 };
  await one('select ingest_fixtures($1)', [{ provider: P, fixtures: [finished] }]);
  // Score is in, player data is not: result settles, the scorer market waits.
  assert.deepEqual(await settleFixture(), { 'match_result:home': 'won', 'player_anytime_scorer:yes': null });

  await one('select ingest_fixture_details($1)', [{
    provider: P, fixture_external_id: 'F1', events_final: true, player_stats_final: true,
    events: [
      { seq: 1, minute: 12, kind: 'goal', team_external_id: 'T1', player_external_id: 'P9', related_player_external_id: 'P10' },
      { seq: 2, minute: 50, kind: 'own_goal', team_external_id: 'T1', player_external_id: 'P10' },
      { seq: 3, minute: 77, kind: 'penalty_goal', team_external_id: 'T1', player_external_id: 'P9' },
    ],
    player_stats: [
      { player_external_id: 'P9', team_external_id: 'T1', minutes: 90, started: true, shots: 4, shots_on_target: 3 },
      { player_external_id: 'P10', team_external_id: 'T1', minutes: 90, started: true },
      { player_external_id: 'P7', team_external_id: 'T2', minutes: 90, started: true },
    ],
  }]);
  const facts = (await one('select fixture_facts($1) as f', [fixtureId])).f;
  assert.deepEqual(facts.goals.map((g) => [g.side, g.ownGoal]), [['home', false], ['away', true], ['home', false]]);
  assert.deepEqual(await settleFixture(), { 'player_anytime_scorer:yes': 'won' });

  const wallet = await rpc(alice, 'select * from get_wallet()');
  // 1000 − 100 − 20, + round(100 × 2.13) + round(20 × 2.6)
  assert.deepEqual([wallet.balance, wallet.open_stakes, wallet.total_returned], [880 + 213 + 52, 0, 265]);

  // Running settlement again changes nothing.
  await one('select settle_selection($1, $2)', [sel['match_result:home'], 'won']);
  assert.deepEqual(await settleFixture(), {});
  assert.equal((await rpc(alice, 'select * from get_wallet()')).balance, 1145);
  assert.equal((await one("select count(*)::int n from wallet_ledger where kind = 'payout' and user_id = $1", [alice])).n, 2);
  assert.ok((await one("select count(*)::int n from notifications where user_id = $1 and kind = 'prediction_won'", [alice])).n === 2);
});

test('a provider correction re-settles with compensating ledger entries', async () => {
  await one('select settle_selection($1, $2, $3)', [sel['player_anytime_scorer:yes'], 'lost', 'Goal reassigned by provider']);
  const wallet = await rpc(alice, 'select * from get_wallet()');
  assert.equal(wallet.balance, 1145 - 52);
  const entry = await one("select amount from wallet_ledger where kind = 'correction' and user_id = $1", [alice]);
  assert.equal(entry.amount, -52);
  const trail = await sql("select action, to_status from prediction_transactions t join predictions p on p.id = t.prediction_id where p.selection_id = $1 order by t.id", [sel['player_anytime_scorer:yes']]);
  assert.deepEqual(trail.map((t) => t.action), ['placed', 'settled', 'resettled']);
});

test('every wallet balance equals the sum of its ledger', async () => {
  const bad = await sql('select w.id from virtual_wallets w where w.balance <> (select coalesce(sum(amount), 0) from wallet_ledger l where l.wallet_id = w.id)');
  assert.equal(bad.length, 0);
});

test('leagues: create, join by code and by invitation link, ranked privately', async () => {
  const league = await rpc(alice, "select * from create_league('Test Mates', false)");
  assert.equal(league.code.length, 6);
  assert.equal((await asUser(bob, (q) => q('select 1 from leagues where id = $1', [league.id]))).length, 0);
  assert.equal(await code(rpc(bob, "select * from join_league('ZZZZZZ')")), 'CODE_NOT_FOUND');
  await rpc(bob, 'select * from join_league($1)', [league.code.toLowerCase()]);
  const invite = await rpc(alice, 'select * from create_invitation($1, 1, 24)', [league.id]);
  await rpc(carol, 'select * from join_league($1)', [invite.token]);
  assert.equal(await code(rpc(carol, 'select * from create_invitation($1)', ['00000000-0000-0000-0000-000000000000'])), 'NOT_A_MEMBER');
  const table = await asUser(bob, (q) => q("select rank::int, username, net_profit::int, is_me from get_rankings('league', null, $1)", [league.id]));
  assert.deepEqual(table.map((r) => r.username), ['carol', 'bob', 'alice']);
  assert.equal(table.find((r) => r.is_me).username, 'bob');
  assert.equal(await code(rpc(bob, 'select leave_league($1, $2)', [league.id, carol])), 'NOT_OWNER');
  await rpc(alice, 'select leave_league($1, $2)', [league.id, carol]);
  assert.equal((await one('select count(*)::int n from league_members where league_id = $1', [league.id])).n, 2);
});

test('friends ranking only includes accepted friends', async () => {
  await rpc(alice, "select request_friend('bob')");
  let table = await asUser(alice, (q) => q("select username from get_rankings('friends')"));
  assert.deepEqual(table.map((r) => r.username), ['alice']);
  await rpc(bob, "select request_friend('alice')");
  table = await asUser(alice, (q) => q("select username from get_rankings('friends')"));
  assert.deepEqual(table.map((r) => r.username).sort(), ['alice', 'bob']);
});

test('closing a week freezes results, keeps history and grants fresh coins', async () => {
  const season = await one('select * from current_season()');
  await sql("update weekly_seasons set starts_at = starts_at - interval '14 days', ends_at = ends_at - interval '14 days' where id = $1", [season.id]);
  assert.deepEqual((await one('select close_due_seasons() as r')).r, { closed: 1 });
  assert.deepEqual((await one('select close_due_seasons() as r')).r, { closed: 0 });

  const results = await sql('select p.username, r.rank, r.net_profit from season_results r join profiles p on p.id = r.user_id where season_id = $1 order by rank', [season.id]);
  assert.deepEqual(results.map((r) => r.username), ['carol', 'bob', 'alice']);
  assert.equal((await one("select count(*)::int n from predictions where status = 'open'")).n, 0);
  assert.equal((await one("select count(*)::int n from user_achievements where achievement_key = 'season_winner'")).n, 1);

  const fresh = await rpc(alice, 'select * from get_wallet()');
  assert.notEqual(fresh.season_id, season.id);
  assert.equal(fresh.balance, 1000);
  assert.equal((await one('select count(*)::int n from virtual_wallets where user_id = $1', [alice])).n, 2);
  const allTime = await asUser(alice, (q) => q("select username, net_profit::int from get_rankings('alltime')"));
  assert.equal(allTime.find((r) => r.username === 'alice').net_profit, 93);
});

test('sync logs expose freshness', async () => {
  const id = (await one("select sync_start('odds', 'the-odds-api') as id")).id;
  await one("select sync_finish($1, 'error', 0, 1, 'HTTP 401', null)", [id]);
  const id2 = (await one("select sync_start('odds', 'the-odds-api') as id")).id;
  await one("select sync_finish($1, 'ok', 42, 3, null, null)", [id2]);
  const row = await asUser(alice, (q) => q("select * from data_freshness where job = 'odds'").then((r) => r[0]));
  assert.ok(row.last_ok_at && row.last_error_at);
  assert.equal(row.last_error, 'HTTP 401');
});


/* ---------------------------------------------------------------------------
 * End to end through the real job code: provider HTTP → normalisers → SQL.
 * The HTTP layer is replaced by canned responses in the providers' documented
 * shapes, with synthetic names. This proves the plumbing; it does not prove
 * the live APIs still match those shapes (that needs real keys).
 * ------------------------------------------------------------------------ */

const JSONB_ARGS = new Set(['p', 'p_default', 'p_meta']);
const db = {
  async rpc(fn, args = {}) {
    const keys = Object.keys(args);
    const call = keys.map((k, i) => `${k} => $${i + 1}${JSONB_ARGS.has(k) ? '::jsonb' : ''}`).join(', ');
    const rows = await sql(`select * from ${fn}(${call})`, keys.map((k) => (JSONB_ARGS.has(k) ? JSON.stringify(args[k]) : args[k])));
    return rows.length === 1 && Object.keys(rows[0]).length === 1 && fn in rows[0] ? rows[0][fn] : rows;
  },
};

function fakeHttp(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, query: Object.fromEntries(u.searchParams), headers: init?.headers ?? {} });
    const route = routes.find((r) => u.pathname.endsWith(r.path) && (!r.when || r.when(u.searchParams)));
    const body = route ? (typeof route.body === 'function' ? route.body(u.searchParams) : route.body) : { response: [], errors: [] };
    return { ok: true, status: 200, headers: { get: (h) => (h.includes('remaining') ? '4321' : null) }, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { fetchImpl, calls, routes };
}

test('sync jobs: fixtures → squads → odds with player props → live → details → settlement', async () => {
  const dave = (await one(`insert into auth.users (email, raw_user_meta_data) values ('dave@test.invalid', '{"username":"dave"}') returning id`)).id;
  await rpc(dave, 'select * from update_profile(p_confirm_adult => true)');
  const kickoff = new Date((await one("select least(now() + interval '2 hours', (current_season()).ends_at - interval '1 second') as t")).t).toISOString();

  const team = (id, name) => ({ id, name, logo: `https://media.invalid/${id}.png` });
  const fixtureBody = (short, goals, half, full) => ({
    fixture: { id: 9001, date: kickoff, venue: { name: 'Test Arena' }, status: { short, elapsed: short === 'FT' ? 90 : null } },
    league: { id: 140, season: 2026, round: 'Regular Season - 13' },
    teams: { home: team(501, 'Test Madrid'), away: team(502, 'Test Barcelona') },
    goals: { home: goals[0], away: goals[1] },
    score: { halftime: { home: half[0], away: half[1] }, fulltime: { home: full[0], away: full[1] }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  });
  let finished = false;
  const football = fakeHttp([
    { path: '/leagues', when: (q) => q.get('id') === '140', body: { response: [{ league: { id: 140, name: 'Test Liga', type: 'League' }, country: { name: 'Testland' }, seasons: [{ year: 2025, current: false }, { year: 2026, current: true, coverage: { odds: true } }] }] } },
    { path: '/fixtures', when: (q) => q.has('league'), body: { response: [fixtureBody('NS', [null, null], [null, null], [null, null])] } },
    { path: '/fixtures', when: (q) => q.has('ids'), body: () => ({ response: [finished ? fixtureBody('FT', [2, 1], [1, 0], [2, 1]) : fixtureBody('1H', [1, 0], [null, null], [null, null])] }) },
    { path: '/teams', when: (q) => q.get('league') === '140', body: { response: [{ team: { id: 501, name: 'Test Madrid', code: 'TMA', country: 'Testland' }, venue: { name: 'Test Arena' } }, { team: { id: 502, name: 'Test Barcelona', code: 'TBA' }, venue: {} }] } },
    { path: '/standings', when: (q) => q.get('league') === '140', body: { response: [{ league: { id: 140, season: 2026, standings: [[{ rank: 1, team: { id: 501 }, points: 30, form: 'WWDWW', all: { played: 12, win: 9, draw: 3, lose: 0, goals: { for: 28, against: 8 } }, home: { played: 6, win: 5, draw: 1, lose: 0, goals: { for: 16, against: 3 } }, away: { played: 6, win: 4, draw: 2, lose: 0, goals: { for: 12, against: 5 } } }]] } }] } },
    { path: '/players/squads', when: (q) => q.get('team') === '501', body: { response: [{ team: { id: 501 }, players: [{ id: 7001, name: 'K. Teststriker', number: 9, position: 'Attacker', photo: 'https://media.invalid/p/7001.png' }, { id: 7002, name: 'J. Testmid', number: 8, position: 'Midfielder' }] }] } },
    { path: '/players/squads', when: (q) => q.get('team') === '502', body: { response: [{ team: { id: 502 }, players: [{ id: 7101, name: 'L. Testwinger', number: 11, position: 'Attacker' }] }] } },
    { path: '/fixtures/lineups', body: { response: [{ team: { id: 501 }, formation: '4-3-3', startXI: [{ player: { id: 7001, name: 'K. Teststriker', number: 9, pos: 'F' } }, { player: { id: 7002, name: 'J. Testmid', number: 8, pos: 'M' } }], substitutes: [] }, { team: { id: 502 }, formation: '4-4-2', startXI: [{ player: { id: 7101, name: 'L. Testwinger', number: 11, pos: 'F' } }], substitutes: [] }] } },
    { path: '/fixtures/players', body: { response: [
      { team: { id: 501 }, players: [
        { player: { id: 7001, name: 'K. Teststriker' }, statistics: [{ games: { minutes: 90, substitute: false, rating: '8.1' }, shots: { total: 4, on: 2 }, goals: { total: 2, assists: null, saves: null }, cards: { yellow: 0, red: 0 }, fouls: { committed: 1 }, tackles: { total: null } }] },
        { player: { id: 7002, name: 'J. Testmid' }, statistics: [{ games: { minutes: 90, substitute: false }, shots: { total: null, on: null }, goals: { total: null, assists: 1 }, cards: { yellow: 1, red: 0 }, fouls: {}, tackles: {} }] }] },
      { team: { id: 502 }, players: [{ player: { id: 7101, name: 'L. Testwinger' }, statistics: [{ games: { minutes: 90, substitute: false }, shots: { total: 2, on: 1 }, goals: { total: 1 }, cards: {}, fouls: {}, tackles: {} }] }] }] } },
    { path: '/fixtures/events', body: { response: [
      { time: { elapsed: 23, extra: null }, team: { id: 501 }, player: { id: 7001, name: 'K. Teststriker' }, assist: { id: 7002, name: 'J. Testmid' }, type: 'Goal', detail: 'Normal Goal', comments: null },
      { time: { elapsed: 41, extra: null }, team: { id: 501 }, player: { id: 7002, name: 'J. Testmid' }, assist: { id: null, name: null }, type: 'Card', detail: 'Yellow Card' },
      { time: { elapsed: 60, extra: null }, team: { id: 502 }, player: { id: 7101, name: 'L. Testwinger' }, assist: { id: null }, type: 'Goal', detail: 'Normal Goal' },
      { time: { elapsed: 90, extra: 3 }, team: { id: 501 }, player: { id: 7001, name: 'K. Teststriker' }, assist: { id: null }, type: 'Goal', detail: 'Penalty' }] } },
    { path: '/fixtures/statistics', body: { response: [{ team: { id: 501 }, statistics: [{ type: 'Ball Possession', value: '58%' }, { type: 'Total Shots', value: 14 }, { type: 'Shots on Goal', value: 6 }, { type: 'Corner Kicks', value: 7 }] }] } },
  ]);
  const market = (key, outcomes) => ({ key, last_update: new Date().toISOString(), outcomes });
  const event = (bookmakers) => ({ id: 'evt-1', sport_key: 'soccer_spain_la_liga', commence_time: kickoff, home_team: 'Test Madrid CF', away_team: 'FC Test Barcelona', bookmakers });
  const odds = fakeHttp([
    { path: '/sports/soccer_spain_la_liga/odds', body: [
      event([
        { key: 'bk_one', title: 'Book One', markets: [market('h2h', [{ name: 'Test Madrid CF', price: 2.0 }, { name: 'FC Test Barcelona', price: 3.5 }, { name: 'Draw', price: 3.6 }]), market('totals', [{ name: 'Over', price: 1.8, point: 2.5 }, { name: 'Under', price: 2.0, point: 2.5 }])] },
        { key: 'bk_two', title: 'Book Two', markets: [market('h2h', [{ name: 'Test Madrid CF', price: 2.1 }, { name: 'FC Test Barcelona', price: 3.4 }, { name: 'Draw', price: 3.5 }])] },
      ]),
      { id: 'evt-2', sport_key: 'soccer_spain_la_liga', commence_time: kickoff, home_team: 'Unknown United', away_team: 'Mystery Town', bookmakers: [{ key: 'bk_one', title: 'Book One', markets: [market('h2h', [{ name: 'Unknown United', price: 1.5 }])] }] },
    ] },
    { path: '/events/evt-1/odds', body: event([{ key: 'bk_one', title: 'Book One', markets: [
      market('player_goal_scorer_anytime', [{ name: 'Yes', description: 'Karl Teststriker', price: 2.4 }, { name: 'Yes', description: 'Nobody Known', price: 9 }]),
      market('player_first_goal_scorer', [{ name: 'Yes', description: 'Karl Teststriker', price: 5.5 }]),
      market('player_shots_on_target', [{ name: 'Over', description: 'Karl Teststriker', price: 2.2, point: 1.5 }]),
      market('player_assists', [{ name: 'Over', description: 'J. Testmid', price: 4.0, point: 0.5 }]),
      market('player_to_receive_card', [{ name: 'Yes', description: 'J Testmid', price: 3.2 }]),
      market('btts', [{ name: 'Yes', price: 1.7 }, { name: 'No', price: 2.1 }]),
      market('some_future_market', [{ name: 'Whatever', price: 4 }]),
    ] }]) },
  ]);

  const ctx = { db, football: createApiFootball('test-key', football.fetchImpl), odds: createTheOddsApi('test-key', odds.fetchImpl) };
  const run = (name) => runJob(ctx, name, JOBS[name].provider, () => JOBS[name].run(ctx));

  assert.deepEqual((await run('fixtures')).items, 1);
  assert.deepEqual((await run('fixtures')).items, 1);
  assert.equal((await one("select count(*)::int n from fixtures where provider = 'api-football'")).n, 1);
  assert.ok(football.calls.every((c) => c.headers['x-apisports-key'] === 'test-key'));
  await run('reference');
  const comp = await one("select name, odds_sport_key, season from competitions where provider = 'api-football'");
  assert.deepEqual(comp, { name: 'Test Liga', odds_sport_key: 'soccer_spain_la_liga', season: 2026 });

  const oddsRun = await run('odds');
  assert.equal(oddsRun.ok, true);
  assert.deepEqual(oddsRun.meta.events_unmatched.length, 1);
  assert.deepEqual(oddsRun.meta.players_unmatched, ['Nobody Known (Test Madrid v Test Barcelona)']);
  assert.equal(oddsRun.meta.outcomes_skipped.some_future_market, 1);
  const fx = await one("select id from fixtures where provider = 'api-football'");
  const offered = await sql(`select fm.market_key, s.key, s.label, pl.name as player, p.avg_odds::float avg, p.bookmaker_count::int n
                             from fixture_markets fm join market_selections s on s.fixture_market_id = fm.id
                             join selection_prices p on p.selection_id = s.id left join players pl on pl.id = s.player_id
                             where fm.fixture_id = $1 order by fm.market_key, s.key`, [fx.id]);
  const byKey = Object.fromEntries(offered.map((o) => [`${o.market_key}:${o.key}`, o]));
  assert.deepEqual(byKey['match_result:home'], { market_key: 'match_result', key: 'home', label: 'Test Madrid', player: null, avg: 2.05, n: 2 });
  assert.equal(byKey['player_anytime_scorer:yes'].player, 'K. Teststriker');
  assert.equal(byKey['player_card:yes'].player, 'J. Testmid');
  assert.equal(byKey['player_assist:yes'].avg, 4);
  assert.equal(byKey['player_shots_on_target:over'].label, 'Over 1.5');
  // Nothing exists for markets no bookmaker priced.
  assert.equal(offered.some((o) => ['correct_score', 'player_shots', 'player_red_card'].includes(o.market_key)), false);
  assert.ok(odds.calls.every((c) => c.headers['x-api-key'] === 'test-key' && !('apiKey' in c.query) && c.query.oddsFormat === 'decimal'));
  assert.deepEqual(odds.calls.map((c) => c.query.regions), ['eu,uk', 'us,uk,eu']);

  // Next run: Book Two no longer lists the match (suspended and dropped by the feed) and a
  // bookmaker's own timestamp has stopped advancing. Both prices must stop being offered.
  const full = odds.calls.length;
  odds.routes[0].body[0].bookmakers.pop();
  odds.routes[1].body.bookmakers[0].markets.find((m) => m.key === 'btts').last_update = new Date(Date.now() - 2 * 3600e3).toISOString();
  await sql("update data_sync_logs set started_at = started_at - interval '1 second'");
  await sql("update odds_snapshots set last_seen_at = last_seen_at - interval '2 seconds'");
  const rerun = await run('odds');
  assert.equal(rerun.meta.quotes_withdrawn, 3);
  assert.equal(odds.calls.length, full + 2);
  const after = Object.fromEntries((await sql(`select fm.market_key || ':' || s.key as k, p.avg_odds::float avg, p.bookmaker_count::int n
                                               from fixture_markets fm join market_selections s on s.fixture_market_id = fm.id
                                               join selection_prices p on p.selection_id = s.id where fm.fixture_id = $1`, [fx.id])).map((r) => [r.k, r]));
  assert.deepEqual([after['match_result:home'].avg, after['match_result:home'].n], [2, 1]);
  assert.deepEqual([after['btts:no'].avg, after['btts:no'].n], [null, 0]);
  odds.routes[1].body.bookmakers[0].markets.find((m) => m.key === 'btts').last_update = new Date().toISOString();
  await run('odds');

  const ids = Object.fromEntries((await sql('select s.id, fm.market_key || \':\' || s.key as k from market_selections s join fixture_markets fm on fm.id = s.fixture_market_id where fm.fixture_id = $1', [fx.id])).map((r) => [r.k, r.id]));
  for (const [k, stake] of [['match_result:home', 100], ['player_anytime_scorer:yes', 50], ['player_first_scorer:yes', 20], ['player_shots_on_target:over', 30], ['player_assist:yes', 10], ['player_card:yes', 10], ['btts:no', 40], ['total_goals:under', 40]]) {
    await place(dave, ids[k], stake, uuid());
  }

  // Kick-off: live sync flips the status, nothing settles yet.
  await sql("update fixtures set kickoff_at = now() - interval '50 minutes' where id = $1", [fx.id]);
  await run('live');
  assert.equal((await one('select status, home_goals from fixtures where id = $1', [fx.id])).status, 'live');
  assert.equal((await run('settle')).items, 0);

  // Full time, but before details are synced: score markets settle, player markets wait.
  finished = true;
  await run('live');
  const early = await run('settle');
  assert.deepEqual([early.items, early.meta.selections_waiting], [3, 5]);
  await run('details');
  assert.equal((await run('settle')).items, 5);
  assert.equal((await run('settle')).items, 0);

  const outcomes = Object.fromEntries((await sql('select market_key, status, payout from predictions where user_id = $1', [dave])).map((r) => [r.market_key, [r.status, r.payout]]));
  assert.deepEqual(outcomes, {
    match_result: ['won', 200],
    player_anytime_scorer: ['won', 120],
    player_first_scorer: ['won', 110],
    player_shots_on_target: ['won', 66],
    player_assist: ['won', 40],
    player_card: ['won', 32],
    btts: ['lost', 0],
    total_goals: ['lost', 0],
  });
  const wallet = await rpc(dave, 'select * from get_wallet()');
  assert.deepEqual([wallet.balance, wallet.open_stakes], [1000 - 300 + 568, 0]);
  const stats = await one('select possession::float p, shots from fixture_statistics where fixture_id = $1', [fx.id]);
  assert.deepEqual(stats, { p: 58, shots: 14 });

  // A job that fails is logged as an error, not swallowed.
  const broken = { ...ctx, odds: createTheOddsApi('', odds.fetchImpl) };
  await sql("update fixtures set status = 'scheduled', kickoff_at = now() + interval '1 day' where id = $1", [fx.id]);
  const failedRun = await runJob(broken, 'odds', 'the-odds-api', () => JOBS.odds.run(broken));
  assert.equal(failedRun.ok, false);
  const log = await one("select status, error from data_sync_logs where job = 'odds' order by id desc limit 1");
  assert.equal(log.status, 'error');
  assert.match(log.error, /THE_ODDS_API_KEY is not configured/);
  await sql("update fixtures set status = 'finished', kickoff_at = now() - interval '3 hours' where id = $1", [fx.id]);
});


test('read API returns each screen in one call, through RLS', async () => {
  const fx = await one("select id from fixtures where provider = 'api-football'");
  const dave = (await one("select id from profiles where username = 'dave'")).id;
  const call = (user, text, params) => rpc(user, `select ${text} as j`, params).then((r) => r.j);
  const list = await call(dave, "list_fixtures(now() - interval '1 day', now() + interval '7 days')");
  assert.equal(list.length, 2);
  const priced = list.find((f) => f.id === Number(fx.id));
  assert.deepEqual(Object.keys(priced.result_prices).sort(), ['away', 'draw', 'home']);
  assert.equal(priced.home.name, 'Test Madrid');
  const detail = await call(dave, 'get_fixture($1)', [fx.id]);
  assert.equal(detail.my_predictions.length, 8);
  assert.equal(detail.lineups.length, 3);
  assert.equal(detail.events.length, 4);
  assert.equal(detail.standings[0].points, 30);
  const markets = await call(dave, 'get_fixture_markets($1)', [fx.id]);
  const scorer = markets.find((m) => m.market_key === 'player_anytime_scorer');
  assert.equal(scorer.selections[0].player.name, 'K. Teststriker');
  assert.equal(scorer.selections[0].quotes[0].bookmaker, 'Book One');
  assert.equal(scorer.selections[0].result, 'won');
  const mine = await call(dave, "my_predictions('settled')");
  assert.equal(mine.length, 8);
  assert.equal((await call(alice, "my_predictions('all')")).every((p) => p.fixture.home.name.startsWith('Test Home')), true);
  const wallet = await call(dave, 'my_wallet()');
  assert.equal(wallet.wallet.balance, 1268);
  assert.equal(wallet.ledger.length, 15);
  assert.equal((await call(alice, 'my_seasons()')).length, 1);
  assert.equal((await call(alice, 'my_leagues()'))[0].code.length, 6);
  const player = await call(dave, 'get_player($1)', [scorer.selections[0].player.id]);
  assert.equal(player.recent[0].goals, 2);
  const profile = await call(alice, 'get_profile()');
  assert.equal(profile.achievements.find((a) => a.key === 'founder').times, 1);
  assert.ok((await call(alice, 'my_notifications()')).length > 0);
  assert.ok((await call(alice, 'list_bookmakers()')).length >= 3);
  assert.equal((await call(alice, 'data_status()')).environment, 'production');
  assert.equal((await call(alice, 'my_friends()'))[0].status, 'accepted');
  const league = (await call(alice, 'my_leagues()'))[0];
  assert.equal((await call(carol, 'get_league($1)', [league.id])), null);
  assert.equal((await call(bob, 'get_league($1)', [league.id])).member_list.length, 2);
});

await bootstrap();
let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✕ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`);
    if (e.where) console.log(`      at: ${String(e.where).split('\n')[0]}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} database tests passed`);
await pool.end();
process.exit(failed ? 1 : 0);
