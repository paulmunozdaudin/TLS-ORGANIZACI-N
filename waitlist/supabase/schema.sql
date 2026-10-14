-- Lista de espera. Ejecuta este archivo entero en Supabase > SQL Editor.
-- Es seguro ejecutarlo más de una vez.

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city text not null check (char_length(city) between 2 and 80),
  skill text not null check (skill in ('desarrollo', 'diseno', 'marketing', 'ventas', 'finanzas', 'contenido', 'otro')),
  seeking text not null check (seeking in ('cofundador', 'colaboradores', 'aprender', 'networking', 'idea')),
  referral_code text not null unique,
  referred_by text references public.waitlist (referral_code) on delete set null,
  privacy_accepted_at timestamptz not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));
create index if not exists waitlist_referred_by_idx on public.waitlist (referred_by);
create index if not exists waitlist_ip_recent_idx on public.waitlist (ip_hash, created_at);

-- Sin políticas: nadie puede leer ni escribir desde el navegador. La web
-- escribe desde el servidor con la clave service_role.
alter table public.waitlist enable row level security;

-- Puesto en la lista: orden de llegada, y cada persona invitada sube
-- `boost` puestos a quien la invitó.
create or replace function public.waitlist_position(code text, boost integer default 5)
returns table (place bigint, referrals bigint, total bigint)
language sql
stable
as $$
  with base as (
    select
      w.referral_code,
      w.created_at,
      row_number() over (order by w.created_at, w.id) as arrival,
      (select count(*) from public.waitlist r where r.referred_by = w.referral_code) as refs
    from public.waitlist w
  ),
  ranked as (
    select
      referral_code,
      refs,
      row_number() over (order by arrival - boost * refs, created_at) as pos
    from base
  )
  select pos, refs, (select count(*) from public.waitlist)
  from ranked
  where referral_code = code;
$$;

revoke all on function public.waitlist_position(text, integer) from public, anon, authenticated;
grant execute on function public.waitlist_position(text, integer) to service_role;

-- Demanda por ciudad y por perfil (consúltalas en el SQL Editor o en Table Editor).
create or replace view public.waitlist_by_city
with (security_invoker = true) as
select initcap(trim(city)) as city, count(*) as people
from public.waitlist
group by 1
order by people desc;

create or replace view public.waitlist_by_profile
with (security_invoker = true) as
select skill, seeking, count(*) as people
from public.waitlist
group by skill, seeking
order by people desc;
