-- Row Level Security and privileges.
-- Principle: clients may read football data, odds and their own game state.
-- They can change nothing directly; every write goes through an RPC.

create or replace function is_league_member(p_league uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from league_members where league_id = p_league and user_id = auth.uid());
$$;

create or replace function is_league_visible(p_league uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from leagues l where l.id = p_league and (l.is_public or is_league_member(l.id)));
$$;

-- Own profile including private preferences (the table grant below exposes
-- only public columns of other people's profiles).
create or replace function my_profile() returns profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Football data, odds and registries: readable by signed-in users.
do $$
declare t text;
begin
  foreach t in array array[
    'app_config','competitions','teams','standings','players','player_season_stats','fixtures','fixture_events',
    'lineups','player_statistics','fixture_statistics','injuries','odds_providers','bookmakers','markets',
    'fixture_markets','market_selections','odds_snapshots','weekly_seasons','achievements','user_achievements',
    'season_results'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- Profiles: everyone sees the public columns; private ones only via my_profile().
grant select (id, username, avatar_color, created_at) on profiles to authenticated;
create policy profiles_read on profiles for select to authenticated using (true);

-- Own game state.
grant select on virtual_wallets, wallet_ledger, predictions, prediction_transactions, notifications, friendships to authenticated;
create policy wallets_own on virtual_wallets for select to authenticated using (user_id = auth.uid());
create policy ledger_own on wallet_ledger for select to authenticated using (user_id = auth.uid());
create policy predictions_own on predictions for select to authenticated using (user_id = auth.uid());
create policy prediction_tx_own on prediction_transactions for select to authenticated
  using (exists (select 1 from predictions p where p.id = prediction_id and p.user_id = auth.uid()));
create policy notifications_own on notifications for select to authenticated using (user_id = auth.uid());
create policy friendships_own on friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

-- Leagues: public ones, and private ones you belong to.
grant select on leagues, league_members, league_season_results, invitations to authenticated;
create policy leagues_read on leagues for select to authenticated using (is_public or is_league_member(id));
create policy league_members_read on league_members for select to authenticated using (is_league_visible(league_id));
create policy league_results_read on league_season_results for select to authenticated using (is_league_visible(league_id));
create policy invitations_read on invitations for select to authenticated using (is_league_member(league_id));

-- Derived views (owned by the migration role, so they read through RLS).
grant select on current_quotes, selection_prices, data_freshness to authenticated;

-- Functions: nothing is callable unless listed here.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  cfg(text, jsonb), odds_stale_interval(), is_league_member(uuid), is_league_visible(uuid), my_profile(),
  get_wallet(), place_prediction(bigint, int, uuid, numeric), get_rankings(text, bigint, uuid, int),
  create_league(text, boolean), join_league(text), join_public_league(uuid), create_invitation(uuid, int, int),
  leave_league(uuid, uuid), delete_league(uuid),
  update_profile(text, text, text, bigint, boolean), request_friend(text), respond_friend(uuid, boolean),
  mark_notifications_read()
to authenticated;

-- Sync and settlement run with the service role only (Edge Functions).
grant execute on all functions in schema public to service_role;
grant select on all tables in schema public to service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
