-- Registries and configuration. No football data and no odds are seeded:
-- those only ever come from the providers.

-- Generated from supabase/functions/_shared/core/markets.ts (a database test
-- fails if the two drift apart).
insert into markets (key, name, grp, scope, has_line, needs, sort) values
  ('match_result', 'Match result', 'result', 'match', false, array['score'], 10),
  ('double_chance', 'Double chance', 'result', 'match', false, array['score'], 20),
  ('draw_no_bet', 'Draw no bet', 'result', 'match', false, array['score'], 30),
  ('btts', 'Both teams to score', 'goals', 'match', false, array['score'], 40),
  ('total_goals', 'Total goals', 'goals', 'match', true, array['score'], 50),
  ('team_total_goals', 'Team total goals', 'goals', 'match', true, array['score'], 60),
  ('correct_score', 'Correct score', 'goals', 'match', false, array['score'], 70),
  ('half_time_result', 'Half-time result', 'halves', 'match', false, array['halftime'], 80),
  ('ht_ft', 'Half-time / full-time', 'halves', 'match', false, array['halftime', 'score'], 90),
  ('first_team_to_score', 'First team to score', 'goals', 'match', false, array['events'], 100),
  ('last_team_to_score', 'Last team to score', 'goals', 'match', false, array['events'], 110),
  ('player_anytime_scorer', 'Anytime goalscorer', 'scorers', 'player', false, array['events', 'player_stats'], 200),
  ('player_first_scorer', 'First goalscorer', 'scorers', 'player', false, array['events', 'player_stats'], 210),
  ('player_last_scorer', 'Last goalscorer', 'scorers', 'player', false, array['events', 'player_stats'], 220),
  ('player_2plus_goals', 'To score 2 or more', 'scorers', 'player', false, array['events', 'player_stats'], 230),
  ('player_3plus_goals', 'To score a hat-trick', 'scorers', 'player', false, array['events', 'player_stats'], 240),
  ('player_score_or_assist', 'To score or assist', 'scorers', 'player', false, array['events', 'player_stats'], 250),
  ('player_assist', 'To assist', 'assists', 'player', false, array['events', 'player_stats'], 300),
  ('player_2plus_assists', 'To assist 2 or more', 'assists', 'player', false, array['events', 'player_stats'], 310),
  ('player_shots', 'Shots', 'shots', 'player', true, array['player_stats'], 400),
  ('player_shots_on_target', 'Shots on target', 'shots', 'player', true, array['player_stats'], 410),
  ('player_card', 'To be carded', 'cards', 'player', false, array['events', 'player_stats'], 500),
  ('player_red_card', 'To be sent off', 'cards', 'player', false, array['events', 'player_stats'], 510),
  ('player_fouls', 'Fouls committed', 'other', 'player', true, array['player_stats'], 600),
  ('player_tackles', 'Tackles', 'other', 'player', true, array['player_stats'], 610),
  ('goalkeeper_saves', 'Goalkeeper saves', 'other', 'player', true, array['player_stats'], 620),
  ('player_to_start', 'To start', 'other', 'player', false, array['lineups'], 630)
on conflict (key) do update
  set name = excluded.name, grp = excluded.grp, scope = excluded.scope,
      has_line = excluded.has_line, needs = excluded.needs, sort = excluded.sort;

insert into odds_providers (id, name, website, terms_url) values
  ('the-odds-api', 'The Odds API', 'https://the-odds-api.com', 'https://the-odds-api.com/terms-and-conditions.html')
on conflict (id) do nothing;

insert into achievements (key, name, description, icon, sort) values
  ('first_win', 'Off the mark', 'Win your first prediction.', 'checkmark-circle', 10),
  ('longshot', 'Long shot', 'Win a prediction priced at 5.00 or higher.', 'rocket', 20),
  ('profitable_week', 'In the green', 'Finish a weekly season in profit.', 'trending-up', 30),
  ('podium', 'Podium', 'Finish a weekly season in the global top three.', 'podium', 40),
  ('season_winner', 'Top of the week', 'Win a weekly season.', 'trophy', 50),
  ('league_winner', 'League champion', 'Finish a week first in one of your leagues.', 'ribbon', 60),
  ('founder', 'Founder', 'Create a league.', 'flag', 70)
on conflict (key) do nothing;

insert into app_config (key, value) values
  ('season_coins', '1000'),
  ('min_stake', '1'),
  -- A price is hidden when our feed has not confirmed it for this long…
  ('odds_stale_minutes', '90'),
  -- …or when the bookmaker had already stopped updating it (The Odds API: a
  -- suspended market's last_update stops advancing before it is removed).
  ('odds_max_bookmaker_age_minutes', '60'),
  -- The Odds API regions: main markets, and per-event markets (player props are mostly US books).
  ('odds_regions', '"eu,uk"'),
  ('odds_event_regions', '"us,uk,eu"'),
  ('season_close_grace_hours', '6'),
  ('require_adult', 'true'),
  ('settlement_rules', '{"voidPostponedAfterHours":48,"voidIfPlayerDidNotPlay":true,"voidFirstScorerIfEnteredAfterFirstGoal":true,"voidStatMarketsOnExtraTime":true,"voidIfDataMissingAfterHours":72}'),
  -- Competitions to synchronise: fixtures-provider league id plus the odds-provider sport key.
  ('competitions', '[
    {"provider":"api-football","external_id":"140","name":"La Liga","odds_sport_key":"soccer_spain_la_liga","priority":10},
    {"provider":"api-football","external_id":"39","name":"Premier League","odds_sport_key":"soccer_epl","priority":20},
    {"provider":"api-football","external_id":"2","name":"UEFA Champions League","odds_sport_key":"soccer_uefa_champs_league","priority":30},
    {"provider":"api-football","external_id":"78","name":"Bundesliga","odds_sport_key":"soccer_germany_bundesliga","priority":40},
    {"provider":"api-football","external_id":"135","name":"Serie A","odds_sport_key":"soccer_italy_serie_a","priority":50},
    {"provider":"api-football","external_id":"61","name":"Ligue 1","odds_sport_key":"soccer_france_ligue_one","priority":60},
    {"provider":"api-football","external_id":"3","name":"UEFA Europa League","odds_sport_key":"soccer_uefa_europa_league","priority":70}
  ]')
on conflict (key) do nothing;
