-- =========================================================
-- MIGYM — ESQUEMA COMPLETO DE BASE DE DATOS (estilo TIMP)
-- Para pegar en: Supabase > SQL Editor > New query > Run
--
-- Este archivo es la ÚNICA fuente de verdad del esquema.
-- Empieza borrando cualquier versión anterior (drop schema),
-- así que es seguro ejecutarlo sobre una base ya usada durante
-- el desarrollo sin arrastrar restos de versiones previas.
--
-- NO EJECUTAR EN PRODUCCIÓN CON DATOS REALES: el DROP SCHEMA
-- borra todos los datos. Para entornos con datos reales, se
-- pasa a migraciones incrementales en vez de este archivo.
-- =========================================================

-- ---------------------------------------------------------
-- 0. LIMPIEZA: borra todo lo anterior de forma segura
-- ---------------------------------------------------------
drop schema if exists public cascade;
create schema public;
grant usage on schema public to public;
grant create on schema public to postgres;

-- El drop schema anterior también borra los GRANTs base que
-- Supabase configura por defecto para que los roles anon/
-- authenticated puedan tocar las tablas de public. Sin esto,
-- aunque RLS y sus policies estén perfectas, cualquier consulta
-- desde la app falla con "permission denied for table ...",
-- porque el permiso a nivel de rol se evalúa ANTES que las
-- policies de RLS.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Para que las tablas creadas MÁS ABAJO en este mismo script (y
-- cualquiera que se cree en el futuro) también reciban estos
-- permisos automáticamente, sin tener que repetirlo a mano.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------
-- 1. PROFILES (extiende auth.users de Supabase)
-- ---------------------------------------------------------
create type user_role as enum ('trainer', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'client',
  phone text,
  avatar_url text,
  color text not null default '#6366f1', -- color identificativo del entrenador
  bio text,                               -- bio / especialidad del entrenador
  created_at timestamptz not null default now()
);

-- Trigger: cuando alguien se registra en auth.users, se crea su profile automáticamente
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------
-- 2. GROUPS — grupos de entrenamiento de cada entrenador
--    (p.ej. "Fuerza avanzado", "Principiantes")
-- ---------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Miembros de cada grupo (clientes asignados)
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, client_id)
);


-- ---------------------------------------------------------
-- 3. CLASSES (plantilla de clase: puede ser recurrente o no)
-- ---------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  name text not null,
  description text,
  max_capacity int not null default 10 check (max_capacity > 0),
  duration_minutes int not null default 60 check (duration_minutes > 0),
  -- Recurrencia (NULL si la clase no se repite automáticamente)
  recurring_weekday int check (recurring_weekday between 0 and 6), -- 0=domingo ... 6=sábado
  recurring_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. CLASS_SESSIONS (sesiones concretas que aparecen en el calendario)
-- ---------------------------------------------------------
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade, -- null si es una sesión suelta sin plantilla
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  name text not null,               -- copiado de classes.name o puesto a mano si es suelta
  description text,
  max_capacity int not null check (max_capacity > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_class_sessions_starts_at on public.class_sessions(starts_at);
create index idx_class_sessions_trainer on public.class_sessions(trainer_id);

-- ---------------------------------------------------------
-- 5. BOOKINGS (reservas de clientes a sesiones)
-- ---------------------------------------------------------
create type booking_status as enum ('confirmed', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (session_id, client_id) -- un cliente no puede reservar la misma sesión dos veces
);

create index idx_bookings_session on public.bookings(session_id);
create index idx_bookings_client on public.bookings(client_id);

-- Límite de cancelación: horas mínimas antes de la clase para poder cancelar
-- (constante fácil de cambiar en un solo sitio)
create function public.cancellation_limit_hours()
returns int language sql immutable as $$ select 4 $$;

-- ---------------------------------------------------------
-- 6. ANNOUNCEMENTS (el "tablón")
-- ---------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_announcements_created on public.announcements(created_at desc);


-- =========================================================
-- FUNCIONES DE NEGOCIO
-- =========================================================

-- Comprobar aforo disponible antes de insertar una reserva
create function public.check_capacity()
returns trigger
language plpgsql
as $$
declare
  v_capacity int;
  v_taken int;
begin
  select max_capacity into v_capacity
  from public.class_sessions where id = new.session_id;

  select count(*) into v_taken
  from public.bookings
  where session_id = new.session_id and status = 'confirmed';

  if v_taken >= v_capacity then
    raise exception 'La clase está completa (aforo: %)', v_capacity;
  end if;

  return new;
end;
$$;

create trigger trg_check_capacity
  before insert on public.bookings
  for each row
  when (new.status = 'confirmed')
  execute procedure public.check_capacity();


-- Comprobar límite de cancelación
create function public.check_cancellation_window()
returns trigger
language plpgsql
as $$
declare
  v_starts_at timestamptz;
begin
  if new.status = 'cancelled' and old.status = 'confirmed' then
    select starts_at into v_starts_at
    from public.class_sessions where id = old.session_id;

    if v_starts_at - now() < (public.cancellation_limit_hours() || ' hours')::interval then
      raise exception 'No se puede cancelar: quedan menos de % horas para la clase', public.cancellation_limit_hours();
    end if;

    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_check_cancellation
  before update on public.bookings
  for each row
  execute procedure public.check_cancellation_window();


-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.announcements enable row level security;

-- Helper: saber si el usuario actual es entrenador
create function public.is_trainer()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer'
  );
$$;

-- ---- PROFILES ----
-- Todos los usuarios autenticados pueden ver todos los perfiles (nombres de entrenadores, etc.)
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Cada usuario solo puede editar su propio perfil
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---- GROUPS ----
create policy "groups_select_all" on public.groups
  for select using (auth.role() = 'authenticated');

create policy "groups_insert_own_trainer" on public.groups
  for insert with check (public.is_trainer() and trainer_id = auth.uid());

create policy "groups_update_own" on public.groups
  for update using (public.is_trainer() and trainer_id = auth.uid());

create policy "groups_delete_own" on public.groups
  for delete using (public.is_trainer() and trainer_id = auth.uid());

-- ---- GROUP_MEMBERS ----
create policy "group_members_select_all" on public.group_members
  for select using (auth.role() = 'authenticated');

create policy "group_members_write_trainer_owns_group" on public.group_members
  for all
  using (
    exists (select 1 from public.groups g where g.id = group_id and g.trainer_id = auth.uid())
  )
  with check (
    exists (select 1 from public.groups g where g.id = group_id and g.trainer_id = auth.uid())
  );

-- ---- CLASSES ----
create policy "classes_select_all" on public.classes
  for select using (auth.role() = 'authenticated');

create policy "classes_insert_trainer" on public.classes
  for insert with check (public.is_trainer() and trainer_id = auth.uid());

create policy "classes_update_own" on public.classes
  for update using (public.is_trainer() and trainer_id = auth.uid());

create policy "classes_delete_own" on public.classes
  for delete using (public.is_trainer() and trainer_id = auth.uid());

-- ---- CLASS_SESSIONS ----
create policy "sessions_select_all" on public.class_sessions
  for select using (auth.role() = 'authenticated');

create policy "sessions_insert_trainer" on public.class_sessions
  for insert with check (public.is_trainer() and trainer_id = auth.uid());

create policy "sessions_update_own" on public.class_sessions
  for update using (public.is_trainer() and trainer_id = auth.uid());

create policy "sessions_delete_own" on public.class_sessions
  for delete using (public.is_trainer() and trainer_id = auth.uid());

-- ---- BOOKINGS ----
-- Un cliente ve solo sus reservas; un entrenador ve las reservas de sus sesiones
create policy "bookings_select_own_or_trainer" on public.bookings
  for select using (
    client_id = auth.uid()
    or exists (
      select 1 from public.class_sessions s
      where s.id = session_id and s.trainer_id = auth.uid()
    )
  );

-- Un cliente solo puede reservar para sí mismo
create policy "bookings_insert_own" on public.bookings
  for insert with check (client_id = auth.uid());

-- Un cliente puede cancelar su propia reserva; el entrenador puede cancelar reservas de sus sesiones
create policy "bookings_update_own_or_trainer" on public.bookings
  for update using (
    client_id = auth.uid()
    or exists (
      select 1 from public.class_sessions s
      where s.id = session_id and s.trainer_id = auth.uid()
    )
  );

-- ---- ANNOUNCEMENTS ----
create policy "announcements_select_all" on public.announcements
  for select using (auth.role() = 'authenticated');

create policy "announcements_insert_trainer" on public.announcements
  for insert with check (public.is_trainer() and author_id = auth.uid());

create policy "announcements_update_own" on public.announcements
  for update using (public.is_trainer() and author_id = auth.uid());

create policy "announcements_delete_own" on public.announcements
  for delete using (public.is_trainer() and author_id = auth.uid());

-- =========================================================
-- VISTA ÚTIL: sesiones con plazas disponibles (para el calendario)
-- =========================================================
create view public.sessions_with_availability as
select
  s.*,
  p.full_name as trainer_name,
  p.color as trainer_color,
  g.name as group_name,
  s.max_capacity - coalesce(b.taken, 0) as available_spots
from public.class_sessions s
join public.profiles p on p.id = s.trainer_id
left join public.groups g on g.id = s.group_id
left join (
  select session_id, count(*) as taken
  from public.bookings
  where status = 'confirmed'
  group by session_id
) b on b.session_id = s.id;

-- =========================================================
-- FIN DEL ESQUEMA
-- =========================================================
