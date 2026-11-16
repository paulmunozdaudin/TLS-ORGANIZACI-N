// Rebuilds a scratch database from the real migrations, with a minimal
// stand-in for the parts of Supabase the migrations rely on (roles, auth.users,
// auth.uid()). Used by the database tests and the local dev server only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function resetDatabase(sql) {
  await sql('drop schema if exists public cascade; drop schema if exists auth cascade; create schema public; create schema auth');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await sql(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${role}') then create role ${role} nologin; end if; end $$`);
  }
  await sql(`
    create extension if not exists pgcrypto;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      encrypted_password text,
      raw_user_meta_data jsonb not null default '{}',
      created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  const dir = path.join(here, '..', 'migrations');
  for (const file of fs.readdirSync(dir).sort()) await sql(fs.readFileSync(path.join(dir, file), 'utf8'));
}
