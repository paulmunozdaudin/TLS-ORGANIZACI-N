-- =============================================================================
-- TLS Organización — esquema de base de datos para Supabase
-- =============================================================================
-- Cómo usarlo:
--   1. Crea un proyecto en https://supabase.com (plan gratuito es suficiente).
--   2. Ve a "SQL Editor" en el panel de Supabase.
--   3. Pega este archivo completo y ejecútalo (Run).
--   4. Copia la "Project URL" y la "anon public key" (Settings > API) a tu
--      archivo .env.local (ver .env.local.example en la raíz del proyecto).
--
-- Este esquema crea un espacio de trabajo compartido llamado "TLS" en el que
-- cualquier persona con el enlace de la aplicación puede leer y escribir datos.
-- No hay autenticación: la identidad de cada persona es simplemente el nombre
-- que introduce al entrar (se guarda en su navegador). Las políticas RLS de
-- abajo son deliberadamente permisivas (acceso público de lectura/escritura)
-- porque es una herramienta interna de confianza compartida por enlace.
-- Si en el futuro añades autenticación (Supabase Auth), sustituye las
-- políticas "true" por comprobaciones sobre auth.uid() / pertenencia al
-- workspace, sin tener que tocar el resto del esquema.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- WORKSPACES — espacios de trabajo compartidos (de momento solo "TLS")
-- ---------------------------------------------------------------------------
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

insert into workspaces (slug, name)
values ('tls', 'TLS')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- NEXT_MEETING — datos de la próxima reunión (una fila "activa" por workspace)
-- ---------------------------------------------------------------------------
create table if not exists next_meeting (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null default 'Reunión semanal',
  meeting_date date,
  meeting_time time,
  location text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create unique index if not exists next_meeting_one_per_workspace
  on next_meeting (workspace_id);

-- ---------------------------------------------------------------------------
-- AGENDA_ITEMS — temas a tratar en la próxima reunión
-- ---------------------------------------------------------------------------
create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  added_by text not null,
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_discusion', 'resuelto')),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_items_workspace_idx on agenda_items (workspace_id, position);

-- ---------------------------------------------------------------------------
-- AGENDA_COMMENTS — comentarios en un tema de agenda
-- ---------------------------------------------------------------------------
create table if not exists agenda_comments (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references agenda_items(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists agenda_comments_item_idx on agenda_comments (agenda_item_id, created_at);

-- ---------------------------------------------------------------------------
-- POLLS / POLL_OPTIONS / POLL_VOTES — votaciones dentro de un tema de agenda
-- ---------------------------------------------------------------------------
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references agenda_items(id) on delete cascade,
  question text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists polls_item_idx on polls (agenda_item_id);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);

create index if not exists poll_options_poll_idx on poll_options (poll_id, position);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  poll_option_id uuid not null references poll_options(id) on delete cascade,
  voter_name text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_name)
);

create index if not exists poll_votes_option_idx on poll_votes (poll_option_id);

-- ---------------------------------------------------------------------------
-- TASKS — tareas de organización de la company (tablero kanban)
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  assignee text,
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_proceso', 'completada')),
  position double precision not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_workspace_idx on tasks (workspace_id, status, position);

-- ---------------------------------------------------------------------------
-- IDEAS — ideas y temas para futuras reuniones
-- ---------------------------------------------------------------------------
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  added_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists ideas_workspace_idx on ideas (workspace_id, created_at);

-- ---------------------------------------------------------------------------
-- MINUTES — actas de reuniones pasadas
-- ---------------------------------------------------------------------------
create table if not exists minutes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  meeting_date date not null,
  attendees text,
  decisions text,
  tasks_assigned text,
  next_steps text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists minutes_workspace_idx on minutes (workspace_id, meeting_date desc);

-- ---------------------------------------------------------------------------
-- ACTIVITY_LOG — historial de cambios recientes ("Pablo añadió un tema"...)
-- ---------------------------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_workspace_idx on activity_log (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — acceso público de lectura/escritura (ver nota arriba)
-- ---------------------------------------------------------------------------
alter table workspaces enable row level security;
alter table next_meeting enable row level security;
alter table agenda_items enable row level security;
alter table agenda_comments enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table tasks enable row level security;
alter table ideas enable row level security;
alter table minutes enable row level security;
alter table activity_log enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'workspaces', 'next_meeting', 'agenda_items', 'agenda_comments',
    'polls', 'poll_options', 'poll_votes', 'tasks', 'ideas', 'minutes', 'activity_log'
  ])
  loop
    execute format('drop policy if exists "public_all_%1$s" on %1$s', t);
    execute format(
      'create policy "public_all_%1$s" on %1$s for all using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- REALTIME — publica los cambios de cada tabla para que todos los usuarios
-- conectados vean las actualizaciones al instante.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'next_meeting', 'agenda_items', 'agenda_comments',
    'polls', 'poll_options', 'poll_votes', 'tasks', 'ideas', 'minutes', 'activity_log'
  ])
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Semilla opcional: fila inicial de "próxima reunión" para el workspace TLS
-- ---------------------------------------------------------------------------
insert into next_meeting (workspace_id, title, meeting_date, meeting_time, location, updated_by)
select id, 'Reunión semanal', current_date + interval '5 days', '10:00', 'Madrid', 'Sistema'
from workspaces where slug = 'tls'
on conflict (workspace_id) do nothing;
