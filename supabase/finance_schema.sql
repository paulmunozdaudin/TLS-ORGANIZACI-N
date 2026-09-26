-- =============================================================================
-- TLS Organización — módulo de Finanzas (protegido con PIN)
-- =============================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase (el mismo
-- proyecto donde ya ejecutaste supabase/schema.sql). Añade una sección de
-- Finanzas (balance total, ingresos, gastos) separada del resto de la app.
--
-- A diferencia de las demás tablas (abiertas a cualquiera con el enlace),
-- estas son más sensibles, así que van protegidas con un PIN compartido:
-- las tablas NO tienen ninguna política de RLS que permita leer o escribir
-- directamente, ni siquiera con la clave "anon" pública de la app. El único
-- acceso es a través de las funciones de abajo (marcadas SECURITY DEFINER),
-- que comprueban el PIN en el servidor antes de devolver o modificar nada.
-- Así, aunque alguien inspeccione el código de la app o llame a la API de
-- Supabase directamente, no puede leer estos datos sin el PIN correcto.
--
-- El PIN por defecto es 0000. Cámbialo justo después de ejecutar este
-- script con (sustituye TU_PIN_NUEVO):
--   select set_finance_pin('tls', '0000', 'TU_PIN_NUEVO');
-- =============================================================================

create table if not exists finance_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  pin_hash text not null
);

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('ingreso', 'gasto')),
  concept text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text,
  entry_date date not null default current_date,
  added_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists finance_entries_workspace_idx
  on finance_entries (workspace_id, entry_date desc);

alter table finance_settings enable row level security;
alter table finance_entries enable row level security;
-- Sin políticas a propósito: con RLS activado y cero políticas, nadie puede
-- leer ni escribir estas tablas por la API pública. Solo las funciones de
-- abajo, que sí pueden saltarse RLS (SECURITY DEFINER) pero solo tras
-- comprobar el PIN.

insert into finance_settings (workspace_id, pin_hash)
select id, crypt('0000', gen_salt('bf'))
from workspaces where slug = 'tls'
on conflict (workspace_id) do nothing;

create or replace function finance_check_pin(p_workspace_id uuid, p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from finance_settings
    where workspace_id = p_workspace_id
      and pin_hash = crypt(p_pin, pin_hash)
  );
$$;

create or replace function finance_list_entries(p_workspace_id uuid, p_pin text)
returns setof finance_entries
language plpgsql
security definer
set search_path = public
as $$
begin
  if not finance_check_pin(p_workspace_id, p_pin) then
    raise exception 'PIN incorrecto';
  end if;
  return query
    select * from finance_entries
    where workspace_id = p_workspace_id
    order by entry_date desc, created_at desc;
end;
$$;

create or replace function finance_add_entry(
  p_workspace_id uuid,
  p_pin text,
  p_type text,
  p_concept text,
  p_amount numeric,
  p_category text,
  p_entry_date date,
  p_added_by text
)
returns finance_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row finance_entries;
begin
  if not finance_check_pin(p_workspace_id, p_pin) then
    raise exception 'PIN incorrecto';
  end if;
  insert into finance_entries (workspace_id, type, concept, amount, category, entry_date, added_by)
  values (p_workspace_id, p_type, p_concept, p_amount, p_category, coalesce(p_entry_date, current_date), p_added_by)
  returning * into new_row;
  return new_row;
end;
$$;

create or replace function finance_delete_entry(p_workspace_id uuid, p_pin text, p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not finance_check_pin(p_workspace_id, p_pin) then
    raise exception 'PIN incorrecto';
  end if;
  delete from finance_entries
  where id = p_entry_id and workspace_id = p_workspace_id;
end;
$$;

create or replace function set_finance_pin(p_workspace_slug text, p_old_pin text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  select id into ws_id from workspaces where slug = p_workspace_slug;
  if ws_id is null then
    raise exception 'Workspace no encontrado';
  end if;
  if not finance_check_pin(ws_id, p_old_pin) then
    raise exception 'PIN actual incorrecto';
  end if;
  update finance_settings set pin_hash = crypt(p_new_pin, gen_salt('bf'))
  where workspace_id = ws_id;
  return true;
end;
$$;

grant execute on function finance_check_pin(uuid, text) to anon, authenticated;
grant execute on function finance_list_entries(uuid, text) to anon, authenticated;
grant execute on function finance_add_entry(uuid, text, text, text, numeric, text, date, text) to anon, authenticated;
grant execute on function finance_delete_entry(uuid, text, uuid) to anon, authenticated;
grant execute on function set_finance_pin(text, text, text) to anon, authenticated;
