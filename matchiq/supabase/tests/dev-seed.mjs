// LOCAL TEST DATA ONLY. Fills a scratch database with synthetic clubs,
// players, fixtures and prices so screens can be exercised without provider
// keys. Every name starts with "Test", bookmakers are "Test Book …", and
// app_config.environment is set to "test", which makes the app show a
// TEST DATA banner. Nothing here is real football or real odds, and none of
// it is ever loaded by a migration.
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export async function seedTestData(sql) {
  const rand = rng(42);
  const P = 'test-data';
  const one = (text, params) => sql(text, params).then((r) => r[0]);
  await sql(`insert into app_config (key, value) values ('environment', '"test"') on conflict (key) do update set value = excluded.value`);

  const leagues = [
    { external_id: 'TL1', name: 'Test Liga', country: 'Testland', season: 2026 },
    { external_id: 'TL2', name: 'Test Premier', country: 'Testshire', season: 2026 },
  ];
  const clubs = ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'London', 'Manchester', 'Liverpool', 'Leeds'].map((n, i) => ({
    external_id: `TT${i + 1}`, name: `Test ${n}`, short_name: `T. ${n}`, code: `T${n.slice(0, 2).toUpperCase()}`, league: i < 4 ? 'TL1' : 'TL2',
  }));
  const positions = ['Goalkeeper', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Attacker', 'Attacker'];
  const players = clubs.flatMap((c, ci) =>
    positions.map((position, pi) => ({
      external_id: `TP${ci}_${pi}`, name: `T. Player ${ci * 7 + pi + 1}`, full_name: `Test Player ${ci * 7 + pi + 1}`,
      team_external_id: c.external_id, position, shirt_number: pi === 0 ? 1 : pi + 3,
    }))
  );
  const standings = clubs.map((c, i) => {
    const played = 12;
    const won = 9 - (i % 4) * 2;
    const drawn = 2;
    const gf = 14 + won * 2;
    const ga = 10 + (i % 4) * 4;
    const half = (k) => {
      const w = Math.min(5, Math.ceil(won * k));
      return { played: 6, won: w, drawn: 1, lost: 5 - w, goals_for: Math.round(gf * k), goals_against: Math.round(ga * (1 - k)) };
    };
    return { competition_external_id: c.league, team_external_id: c.external_id, season: 2026, position: (i % 4) + 1, played, won, drawn, lost: played - won - drawn, goals_for: gf, goals_against: ga, points: won * 3 + drawn, form: 'WDWLW', home: half(0.6), away: half(0.4) };
  });
  await one('select ingest_reference($1)', [{ provider: P, competitions: leagues, teams: clubs, players, standings }]);
  await sql(`update competitions set priority = case external_id when 'TL1' then 10 else 20 end where provider = $1`, [P]);
  await sql(`insert into player_season_stats (player_id, competition_id, season, appearances, starts, minutes, goals, assists, yellow_cards, red_cards, shots, shots_on_target)
             select p.id, c.id, 2026, 12, 10, 900, case p.position when 'Attacker' then 7 when 'Midfielder' then 3 else 0 end,
                    case p.position when 'Midfielder' then 5 else 2 end, 2, 0, case p.position when 'Attacker' then 34 else 9 end,
                    case p.position when 'Attacker' then 16 else 3 end
             from players p join teams t on t.id = p.team_id join standings s on s.team_id = t.id join competitions c on c.id = s.competition_id
             where p.provider = $1 on conflict do nothing`, [P]);

  const season = await one('select * from current_season()');
  const end = new Date(season.ends_at).getTime();
  const now = Date.now();
  const pairs = [[0, 1], [2, 3], [4, 5], [6, 7], [1, 2], [5, 6], [3, 0], [7, 4]];
  const fixtures = pairs.map(([h, a], i) => {
    // Spread kick-offs through the rest of the week; two already played.
    const kickoff = i < 2 ? now - (30 - i * 3) * 3600e3 : Math.min(now + (3 + (i - 2) * 9) * 3600e3, end - (9 - i) * 600e3);
    const done = i < 2;
    return {
      external_id: `TF${i + 1}`, competition_external_id: clubs[h].league === clubs[a].league ? clubs[h].league : 'TL1', season: 2026, round: 'Test Round 13',
      home_external_id: clubs[h].external_id, away_external_id: clubs[a].external_id, kickoff_at: new Date(kickoff).toISOString(), venue: `${clubs[h].name} Stadium`,
      status: done ? 'finished' : 'scheduled', home_goals: done ? 2 - i : null, away_goals: done ? 1 : null,
      ht_home: done ? 1 : null, ht_away: done ? 0 : null, ft_home: done ? 2 - i : null, ft_away: done ? 1 : null,
    };
  });
  await one('select ingest_fixtures($1)', [{ provider: P, fixtures }]);

  // A finished match with events, lineups and statistics.
  const squad = (ci) => players.filter((p) => p.team_external_id === clubs[ci].external_id);
  const lineups = [0, 1].flatMap((ci) => squad(ci).map((p) => ({ team_external_id: p.team_external_id, player_external_id: p.external_id, is_starter: true, position: p.position[0], shirt_number: p.shirt_number, formation: '2-2-2' })));
  await one('select ingest_fixture_details($1)', [{
    provider: P, fixture_external_id: 'TF1', events_final: true, player_stats_final: true, lineups,
    events: [
      { seq: 1, minute: 18, kind: 'goal', team_external_id: 'TT1', player_external_id: 'TP0_5', related_player_external_id: 'TP0_3' },
      { seq: 2, minute: 39, kind: 'yellow', team_external_id: 'TT2', player_external_id: 'TP1_1' },
      { seq: 3, minute: 61, kind: 'goal', team_external_id: 'TT2', player_external_id: 'TP1_6' },
      { seq: 4, minute: 84, kind: 'penalty_goal', team_external_id: 'TT1', player_external_id: 'TP0_5' },
    ],
    player_stats: [0, 1].flatMap((ci) => squad(ci).map((p, pi) => ({ team_external_id: p.team_external_id, player_external_id: p.external_id, minutes: 90, started: true, shots: pi >= 5 ? 4 : 1, shots_on_target: pi >= 5 ? 2 : 0, goals: p.external_id === 'TP0_5' ? 2 : p.external_id === 'TP1_6' ? 1 : 0, assists: p.external_id === 'TP0_3' ? 1 : 0 }))),
    team_stats: [
      { team_external_id: 'TT1', possession: 57, shots: 15, shots_on_target: 6, corners: 7, fouls: 11, yellow_cards: 0, red_cards: 0, offsides: 2 },
      { team_external_id: 'TT2', possession: 43, shots: 9, shots_on_target: 3, corners: 3, fouls: 14, yellow_cards: 1, red_cards: 0, offsides: 1 },
    ],
  }]);

  const ids = Object.fromEntries((await sql('select id, external_id from fixtures where provider = $1', [P])).map((r) => [r.external_id, r.id]));
  const playerIds = Object.fromEntries((await sql('select id, external_id, name from players where provider = $1', [P])).map((r) => [r.external_id, r]));
  const books = [['test_book_a', 'Test Book A'], ['test_book_b', 'Test Book B'], ['test_book_c', 'Test Book C'], ['test_book_d', 'Test Book D']];
  const quotes = [];
  const price = (p) => Math.max(1.05, Math.round((0.94 / p) * (0.97 + rand() * 0.06) * 100) / 100);
  const add = (fixture, market_key, selection_key, label, prob, extra = {}, takers = books) => {
    for (const [bookmaker_key, bookmaker_name] of takers) {
      quotes.push({ fixture_id: ids[fixture.external_id], market_key, selection_key, label, bookmaker_key, bookmaker_name, decimal_odds: price(prob), provider_updated_at: new Date(now - rand() * 3600e3).toISOString(), source_ref: `test:${fixture.external_id}:${market_key}`, ...extra });
    }
  };
  fixtures.slice(2).forEach((f, i) => {
    const [h, a] = pairs[i + 2];
    const home = clubs[h].name;
    const away = clubs[a].name;
    const ph = 0.3 + rand() * 0.3;
    const pd = 0.26;
    add(f, 'match_result', 'home', home, ph);
    add(f, 'match_result', 'draw', 'Draw', pd);
    add(f, 'match_result', 'away', away, 1 - ph - pd);
    add(f, 'double_chance', 'home_draw', `${home} or Draw`, ph + pd, {}, books.slice(0, 2));
    add(f, 'double_chance', 'draw_away', `Draw or ${away}`, 1 - ph, {}, books.slice(0, 2));
    add(f, 'btts', 'yes', 'Yes', 0.55, {}, books.slice(0, 3));
    add(f, 'btts', 'no', 'No', 0.45, {}, books.slice(0, 3));
    for (const [line, over] of [[1.5, 0.76], [2.5, 0.54], [3.5, 0.3]]) {
      add(f, 'total_goals', 'over', `Over ${line}`, over, { line }, line === 2.5 ? books : books.slice(0, 2));
      add(f, 'total_goals', 'under', `Under ${line}`, 1 - over, { line }, line === 2.5 ? books : books.slice(0, 2));
    }
    // Player markets: only on the first three matches and only from two books, as real coverage is patchy.
    if (i < 3) {
      for (const ci of [h, a]) {
        for (const p of squad(ci).filter((x) => x.position !== 'Goalkeeper' && x.position !== 'Defender')) {
          const pl = playerIds[p.external_id];
          const attacker = p.position === 'Attacker';
          const extra = { player_id: pl.id };
          add(f, 'player_anytime_scorer', 'yes', pl.name, attacker ? 0.38 : 0.16, extra, books.slice(0, 2));
          if (attacker) add(f, 'player_first_scorer', 'yes', pl.name, 0.14, extra, books.slice(0, 1));
          add(f, 'player_assist', 'yes', pl.name, attacker ? 0.2 : 0.24, extra, books.slice(1, 2));
          if (attacker) {
            add(f, 'player_shots_on_target', 'over', 'Over 0.5', 0.68, { ...extra, line: 0.5 }, books.slice(0, 2));
            add(f, 'player_shots_on_target', 'under', 'Under 0.5', 0.32, { ...extra, line: 0.5 }, books.slice(0, 2));
          } else {
            add(f, 'player_card', 'yes', pl.name, 0.22, extra, books.slice(0, 1));
          }
        }
      }
    }
  });
  await sql(`insert into odds_providers (id, name, website) values ('test-data', 'Synthetic test prices', null) on conflict do nothing`);
  for (let i = 0; i < quotes.length; i += 400) await one('select ingest_odds($1)', [{ provider: 'test-data', quotes: quotes.slice(i, i + 400) }]);
  // One suspended price and one stale one, to exercise those states.
  await sql(`update odds_snapshots set suspended = true where id = (select min(id) from odds_snapshots where bookmaker_id = (select id from bookmakers where key = 'test_book_d'))`);
  const log = await one("select sync_start('odds', 'test-data') as id");
  await one("select sync_finish($1, 'ok', $2, 0, null, null)", [log.id, quotes.length]);
  console.log(`seeded TEST data: ${fixtures.length} fixtures, ${quotes.length} synthetic quotes`);
}
