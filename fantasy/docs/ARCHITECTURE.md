# Architecture and roadmap

## 1. Repository audit

- The repository already held **TLS Organización**: a working Next.js 16 /
  React 19 / Tailwind 4 web app backed by Supabase (shared workspace, agenda,
  tasks, ideas, minutes, PIN-gated finances, realtime). It has no auth beyond a
  display name, no tests, and nothing related to fantasy football.
- Nothing in it is reusable for a React Native product (web-only UI, different
  domain, permissive RLS designed for a trusted team).
- Decision: leave it untouched and build the fantasy app as an isolated Expo
  project in `fantasy/`. Only two root files changed, to keep the Next.js build
  and linter from picking up the Expo sources (`tsconfig.json` exclude,
  `eslint.config.mjs` ignore). The two apps should use **separate Supabase
  projects**; the TLS schema's open policies must not sit next to game data.
- If the fantasy app outgrows this arrangement, move it to its own repository.

## 2. What exists today

```
Screens (Expo Router)  ──►  store.ts (actions, persistence, toasts)
                                 │
                                 ▼
                         state/game.ts   pure actions: (state, input, ctx) → Result<state>
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
           src/domain                     src/data
   scoring · lineup · market        FootballDataProvider
   league · rules (config)          demo catalogue + simulator
```

- Screens never compute budgets, auction outcomes or scores; they call an
  action and render the result or its error.
- `src/domain` is dependency-free and deterministic, so the same files can be
  imported by Supabase Edge Functions (Deno) for authoritative results.
- Demo mode is a complete local implementation of the game loop, not a mock of
  a server: create/join league → blind auction rounds → lineup with deadline →
  matchday scoring → standings, chat, notifications, achievements.

## 3. Target architecture

```
Expo app ──(supabase-js, anon key, user JWT)──► Supabase
                                                 ├─ Auth (email, Google, Apple)
                                                 ├─ Postgres + RLS  (reads; a few safe writes)
                                                 ├─ RPC / Edge Functions (every game mutation)
                                                 ├─ Realtime (chat, live scores, lobby)
                                                 ├─ Storage (avatars)
                                                 └─ pg_cron → Edge Functions
                                                        ├─ sync-football-data ──► provider API (secret key)
                                                        ├─ close-market-round
                                                        └─ score-matchday
```

The client swaps `state/store.ts` for a Supabase-backed repository with the
same action names; screens do not change.

### Authority rules

| Operation | Where it runs | Guarantee |
| --- | --- | --- |
| Place / cancel bid | `place_bid` RPC (security definer) | Validates price, budget minus open bids, squad room; one open bid per manager and player (unique index) |
| Close auction round | `close-market-round` function, one transaction, `SELECT … FOR UPDATE` on the league's teams | Same algorithm as `domain/market.ts → resolveRound`; a player is sold once (unique `(league_id, player_id)` on squads); budgets have `CHECK (budget >= 0)` |
| Sell player | `sell_player` RPC | Refund from stored `paid`, lineup pruned in the same transaction |
| Save lineup | `save_lineup` RPC | Ownership, formation, captain; rejected when `now() >= matchday.deadline` |
| Score matchday | `score-matchday` function | Freezes lineups into `lineups` at the deadline, upserts `fantasy_scores` and `head_to_head_matches` keyed by `(league_id, matchday_id, …)` so re-runs are idempotent |
| Standings | SQL view over `head_to_head_matches` | Derived, never incremented |

Every mutation writes an `audit_log` row (actor, action, payload, timestamp).

### Database (Phase 3 migrations)

`profiles` (1:1 `auth.users`), `friendships`, `leagues`, `league_members`,
`invitations`, `competitions`, `clubs`, `football_players`, `fixtures`,
`player_statistics`, `matchdays`, `fantasy_teams` (budget), `fantasy_squads`
(player, paid), `transfer_bids`, `transfers`, `lineups`, `fantasy_scores`,
`head_to_head_matches`, `league_rankings` (view), `achievements`,
`user_achievements`, `messages`, `message_reactions`, `notifications`,
`push_tokens`, `scoring_rules` (per league, JSON matching `GameRules`),
`audit_log`.

RLS principles: football reference data is readable by any signed-in user;
league data only by members (`EXISTS` on `league_members`); other managers'
open bids are never readable (blind auction); game tables have **no** client
insert/update/delete policies — writes go through RPCs.

## 4. Football data provider

The app depends only on `FootballDataProvider` (`src/data/provider.ts`).
A provider has not been chosen. API-Football and Sportmonks both need to be
checked against the same list **before** committing, using their current
documentation and terms rather than assumptions:

1. Per-player, per-fixture statistics for the launch competitions: minutes,
   goals, assists, cards, saves, goals conceded, penalties, own goals.
2. How soon after (or during) a match those statistics are final, and whether
   corrections are republished.
3. Rate limits and price at the request volume of a full sync plus matchday polling.
4. Licence terms: commercial use in a consumer app, caching and storing data,
   use of player names, photos and club badges. Photos and badges usually need
   separate rights; the UI ships generated crests and initials for that reason.
5. Stable player/club identifiers across seasons and transfers.

Sync runs server-side on a schedule and writes to Postgres; phones read
Postgres only. If the feed is late the app shows the last update time and
labels it as not live — it never invents numbers.

## 5. Roadmap

| Phase | Deliverable | Notes |
| --- | --- | --- |
| 1 ✅ | Audit, architecture, roadmap | This document |
| 2 ✅ | Design system, navigation, all screens, demo game loop, engine tests | |
| 3 | Supabase project, migrations, RLS, email/Google/Apple auth, profile sync | Needs Supabase project, Apple Developer and Google OAuth credentials |
| 4 | Leagues, invitations and deep links, membership, lobby realtime | |
| 5 | Provider selection, sync functions, caching, freshness labels | Needs provider contract and API key |
| 6 | Server-side auction, lineups, deadlines, scoring; pgTAP + concurrency tests | Ports `src/domain`, deletes demo controls from production builds |
| 7 | Friends, push notifications, achievements, chat realtime, entitlement table for premium | Needs APNs / FCM credentials |
| 8 | E2E tests (Maestro), RLS test suite, performance, EAS builds, store listings | |

## 6. Risks

- **Data licensing** is the largest commercial risk: real names, images and
  competition marks may need rights beyond an API subscription.
- **Provider latency and corrections** change scores after the fact; scoring
  must be re-runnable and results marked provisional until confirmed.
- **Auction concurrency**: solved by settling in one transaction with row
  locks and database constraints, and must be load-tested (Phase 8).
- **Fairness and abuse**: multi-accounting in public leagues, chat moderation
  and reporting are not designed yet.
- **App Store rules**: Sign in with Apple is mandatory alongside Google;
  premium must use in-app purchase; the product must stay clear of gambling.
- **Expo SDK churn**: SDK 58 changed router APIs; follow `AGENTS.md` and the
  versioned docs on every upgrade.
- **Shared repository** with an unrelated app complicates CI and releases.
