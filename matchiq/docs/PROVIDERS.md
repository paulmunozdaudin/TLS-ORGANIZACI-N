# Data providers: research, choice and integration

Researched 16 November 2026. Read the "How sure" column before relying on a row.

| Level | Meaning |
| --- | --- |
| **Read** | Taken from the provider's own documentation, pricing and terms pages, opened directly. |
| **Snippet** | The provider's site could not be opened from the research environment (network policy). The claim comes from search-engine summaries of the provider's pages. Re-check before signing anything. |
| **Unverified** | Not found on the provider's pages. |

Nothing here was confirmed with a live API call: no API key was available.
`npm run sync:local` (see the README) is the first thing to run once keys exist.

## 1. Decision

| Need | Provider | Why |
| --- | --- | --- |
| Fixtures, teams, squads, standings, live scores, line-ups, events, team and player match statistics, injuries | **API-Football** (API-Sports v3) | One API covers every item on the list for all seven target competitions, with per-fixture player statistics (shots, shots on target, cards, fouls, tackles, saves) that settlement needs. Cheapest plan that fits the request volume. |
| Bookmaker odds for match markets and player markets | **The Odds API** (v4) | The only provider whose documentation was read in full. Documents all the player markets asked for (anytime / first / last scorer, assists, shots, shots on target, cards), publishes its terms, and explicitly allows commercial display in an app. |

Two providers are integrated because no single one covers both jobs well:
API-Football's own odds feed updates every three hours and no player market
could be confirmed in its pre-match odds; The Odds API has no squads,
line-ups or player statistics.

Kept in reserve, not integrated:

- **Sportmonks** as the fixtures/statistics alternative if API-Football's
  licensing position is not acceptable (its terms are clearer about storing and
  showing data commercially).
- **odds-api.io** or **SportsGameOdds** as a second odds source if The Odds
  API's player-market coverage (mostly US bookmakers) proves too thin in
  practice, especially for European bookmakers.
- **OpticOdds** or **Sportradar** when the product needs contractual licences
  and streaming at scale.

## 2. Answers to the specific questions

| Question | Answer | How sure |
| --- | --- | --- |
| Who supplies real fixtures? | API-Football `GET /fixtures` (also Sportmonks `/fixtures/date/{date}`) | Snippet |
| Who supplies real bookmaker odds? | The Odds API `GET /v4/sports/{sport}/odds` (match result, totals) and `/events/{id}/odds` (everything else) | Read |
| Anytime goalscorer odds | The Odds API `player_goal_scorer_anytime` | Read |
| First goalscorer odds | The Odds API `player_first_goal_scorer` (last: `player_last_goal_scorer`) | Read |
| Player assists odds | The Odds API `player_assists`, `player_assists_alternate` (over/under) | Read |
| Shots and shots on target | The Odds API `player_shots`, `player_shots_on_target` and their `_alternate` versions (over/under) | Read |
| Player cards | The Odds API `player_to_receive_card`, `player_to_receive_red_card` | Read |
| Which competitions have player markets? | The Odds API states: "Soccer player props are available for EPL, French Ligue 1, German Bundesliga, Italian Serie A, Spanish La Liga, and MLS. Coverage is currently limited to US bookmakers." **Champions League and Europa League are not listed.** Its own examples also show 1xBet and Sky Bet returning player markets, so non-US coverage exists but is undocumented. | Read |
| Player markets *not* offered by The Odds API | Two-or-more goals, hat-trick, score-or-assist, fouls, tackles, goalkeeper saves, player to start. They stay in the registry (settlement is implemented) but will not appear until a provider prices them. | Read |
| What does it cost? | See section 4. Roughly US$19 + US$119 per month at production cadence. | Snippet / Read |
| Can the data legally be shown in MATCH.IQ? | The Odds API: yes, its terms permit it (section 5). API-Football: data use appears permitted, but logos and photos carry no licence and "betting or fantasy platforms" may need rights-holder licences. Neither API grants rights to club badges, player photos or competition names. This needs a lawyer before launch. | Read / Snippet |

## 3. Comparison

| | API-Football | Sportmonks | The Odds API | SportsGameOdds | odds-api.io | OpticOdds |
| --- | --- | --- | --- | --- | --- | --- |
| How sure | Snippet | Snippet | **Read** | Snippet | Snippet | Snippet |
| Competitions | All seven targets (league ids 140, 39, 2, 78, 135, 61, 3) | All seven need the Growth plan (30 leagues) | All seven have sport keys | All seven league ids documented | Football listed, per-league list not found | PL, La Liga, Serie A, UCL named |
| Teams, players, squads | Yes | Yes | No (team names only, no player ids) | Player ids in odds | No | Player ids in odds |
| Upcoming fixtures / results | Yes | Yes | Events and scores only | Events | Events | Fixtures |
| Live scores | Every 15 s | Yes | About every 30 s | – | – | – |
| Line-ups | 20–60 min before kick-off | Include on fixtures | No | No | No | No |
| Injuries / suspensions | `/injuries`, every 4 h | `sidelined` include | No | No | No | No |
| Player match statistics | `/fixtures/players`, every minute | `lineups.details` | No | No | No | No |
| Pre-match odds | Every 3 h, 1–14 days ahead | About every 10 min (standard), 1–2 min (premium) | 60 s | 10 min free, sub-minute paid | "seconds" (claimed) | Sub-second (claimed) |
| Live odds | Every 5–60 s | 2–10 s (bet365 only on standard) | 40–60 s | Paid tiers | WebSocket add-on | SSE stream |
| Player markets | None confirmed pre-match | Goalscorer markets on marketing pages only; no ids found | 11 documented keys | Goalscorer, shots, shots on target, assists, cards | Anytime scorer, shots, shots on target, passes, assist | Claimed; names not public |
| Player identified by | – | Unverified | Name string | Player id | Name string | Player id |
| Bookmakers | "33" | 50+ standard, 110+ premium | US, UK, EU, AU regions; no Spain region; no bet365 for football | US books plus bet365 | 265–450 (pages disagree), European books | 100–200 (pages disagree) |
| Rate limits | 300/min, 7,500/day on Pro | 2,000–3,000 calls per entity per hour | 30 requests/s; monthly credits | 50 req/min on Rookie | 5,000/hour | By contract |
| Price | Free 100/day (no current season); Pro US$16–19, Ultra US$26–29, Mega US$36–39 per month | €29 (5 leagues), €99 (30), €249 (120) per month + odds add-on from €15; premium odds from €129 | Free 500 credits; US$30 (20K), US$59 (100K), US$119 (5M), US$249 (15M) per month | Free 2,500 objects; US$149; US$499 per month | £49–£229 per month by bookmaker count | Contact sales |
| Commercial display | Unclear; resale forbidden | Explicitly allowed; raw resale forbidden | Explicitly allowed if data is not the product sold | Allowed inside an app that adds value | Allowed, including paid apps | Public terms forbid it; needs a contract |
| Logos and photos | Delivered, **no rights granted** | Delivered, **no rights granted** | Not delivered | Not delivered | Not delivered | Unverified |

Also looked at and ruled out: **SockOdds** (no evidence of football coverage;
indexed pages cover US and Australian sports only), **OddsPapi** (its own blog
reports no player props on a La Liga round), **Genius Sports / Stats Perform /
LSports / OddsMatrix** (feeds that price markets for bookmakers, not sources of
bookmaker odds for an app; contract pricing).

## 4. Credentials and cost

| Secret | Where it lives | Plan needed |
| --- | --- | --- |
| `API_FOOTBALL_KEY` | Supabase Edge Function secret | **Pro** (7,500 requests/day). The free plan excludes the current season, so it cannot show upcoming fixtures. |
| `THE_ODDS_API_KEY` | Supabase Edge Function secret | **5M credits** (US$119) for the default cadence. The free 500 credits are enough for a handful of test calls only. |
| `CRON_SECRET` | Edge Function secret and `supabase/cron.sql` | Any long random string you generate. |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App build (public by design) | Supabase project. |
| Supabase access token / database password | Your machine or CI, for `supabase db push` and `functions deploy` | – |
| Later: Google OAuth client, Apple Sign in key, APNs / FCM, EAS | Supabase Auth settings / Expo | For social sign-in, push and store builds. |

### Request budget (default schedule in `supabase/cron.sql`)

**The Odds API** charges `markets × regions` per bulk call and
`markets returned × regions` per event call.

| Job | Calls | Credits |
| --- | --- | --- |
| Main markets (`h2h`, `totals`; regions `eu,uk`) for 7 competitions every 30 min | 336/day | 4 each → about 40,000/month |
| Event markets (up to 18 keys; regions `us,uk,eu`) for fixtures inside 48 h, every 30 min | 96 per fixture | up to 54 each → up to about 5,000 per fixture, 1.3M/month at 65 fixtures a week |

That fits the 5M plan with room to poll faster near kick-off. On the 100K plan,
restrict event markets to one region and one pull every few hours
(`odds_event_regions` in `app_config`, and the cron line).

**API-Football** on a busy matchday: live status once a minute (about 600),
match details every 5 min for live fixtures (about 1,200), daily squads and
standings (about 160), fixtures four times a day (56). Roughly 2,000–3,500 a
day against a 7,500 allowance.

## 5. Licensing and legal position

This is a summary of what the providers publish, not legal advice.

**The Odds API** (terms dated 31 August 2026, read in full):

- "We support and encourage the use of our data in websites, mobile apps,
  dashboards, analytical tools, and other user-facing applications, including
  commercial use, provided our data is not the primary product being sold or
  redistributed."
- Storing is allowed: "Storing our data and retaining it indefinitely".
- Not allowed: reselling or redistributing the data as a data product or API.
- Bookmaker names may be used "solely for identification, descriptive
  reference, and factual comparison of markets". Nothing licenses bookmaker
  **logos**, so the app shows names only.
- Data is "aggregated from publicly accessible sources" and from feeds with
  permission; the provider is not affiliated with the bookmakers.
- It encourages responsible-gambling messaging and leaves local compliance to
  the customer.

**API-Football** (snippets of its terms and docs):

- Logos and images are "provided solely for identification and descriptive
  purposes"; "no intellectual property rights are claimed over them"; customers
  "must verify and obtain any necessary authorizations or licenses".
- "We does not grant any commercial rights on such competitions."
- Use on betting, fantasy or mass-media platforms "may need additional
  licences from rights holders".
- No clause on caching or storing was found.

**Open items for specialist review before launch**

1. Club badges, player photos and competition names: neither provider licenses
   them. The app falls back to club codes and a neutral player icon when no
   image URL is stored, so images can be switched off by not storing URLs.
2. Whether showing bookmaker odds to consumers counts as gambling advertising
   in each launch country (in Spain, Royal Decree 958/2020 restricts gambling
   advertising), even with virtual coins and no betting.
3. Age gating: the app asks users to confirm they are 18 or older before
   predicting. Whether that is sufficient depends on the jurisdiction and store
   policy.
4. GDPR: player data is personal data; user accounts, predictions and friend
   lists need a privacy policy, a lawful basis and deletion handling.
5. App Store and Google Play policies on simulated gambling.
6. A written confirmation from API-Football that this use is covered, or a
   switch to Sportmonks.

Real-money play is not implemented in any form: no deposits, withdrawals,
purchases, transfers or prizes exist in the schema or the app.

## 6. How the integration works

```
pg_cron ─► Edge Function `sync` ─► provider client ─► normaliser ─► SQL ingest function
                 (secrets)          (fetch, quota)     (pure TS)     (idempotent upsert)
```

- **Identity.** Everything from API-Football is keyed by `(provider,
  external_id)`; re-running a sync updates rows and never duplicates them.
- **Joining the two providers.** The Odds API has no shared ids, so an odds
  event is matched to a fixture by kick-off time (±3 h) and normalised team
  names, and a player market to a squad member by name
  (`core/matching.ts`). Ambiguous or unknown names are dropped and listed in
  the sync log; they are never attached to a best guess. Add spellings to
  `team_aliases` when a club fails to match.
- **Markets exist only when priced.** `fixture_markets` and
  `market_selections` rows are created by `ingest_odds` when a real quote
  arrives. There is no code path that creates a price.
- **Snapshots.** `odds_snapshots` is append-only: a new row per bookmaker
  price change, with provider, bookmaker, source reference and timestamps. A
  prediction stores the price it locked, the snapshot id (or the list of quotes
  behind an average) and never changes.
- **Suspended and stale prices.** The Odds API has no suspended flag: "When a
  market is suspended or closed, its last_update stops advancing, and the
  market is removed from the API response after about 15 minutes." So a quote
  is usable only if the feed confirmed it recently (`odds_stale_minutes`), the
  bookmaker was still updating it (`odds_max_bookmaker_age_minutes`), and it
  was not missing from the latest complete fetch (`withdrawn_at`). Otherwise the
  selection shows no price and cannot be predicted.
- **Freshness.** Every job run is logged in `data_sync_logs`; the app reads
  `data_status()` and shows a banner when the odds feed is late or failing.

### What still has to be confirmed with real keys

1. API-Football response shapes against the normalisers (written from the
   documented v3 format).
2. Which bookmakers actually return player markets for each competition, and
   whether Champions League and Europa League have any.
3. How well bookmaker player names match API-Football squad names; expect to
   add aliases.
4. Team-name matching across the two providers for all seven competitions.
5. Real credit consumption per sync, to tune the schedule.
