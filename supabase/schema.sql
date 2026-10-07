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

create type training_modality as enum (
  'individual',
  'duo',
  'group3',
  'group4',
  'custom_group'
);

create type booking_status as enum (
  'confirmed',
  'cancelled'
);

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
declare
  v_color text;
begin
  -- El rol NUNCA se toma de raw_user_meta_data: ese campo lo rellena
  -- el propio usuario al registrarse (o cualquiera que llame a la API
  -- de signUp directamente), así que no es de fiar. Todo registro
  -- público entra como 'client'; a entrenador se asciende a mano
  -- (UPDATE profiles SET role = 'trainer' WHERE id = ...) desde Supabase.
  v_color := case (
    select count(*) from public.profiles where role = 'trainer'
  ) % 6
    when 0 then '#2563eb'
    when 1 then '#16a34a'
    when 2 then '#eab308'
    when 3 then '#dc2626'
    when 4 then '#7c3aed'
    else '#0891b2'
  end;
  insert into public.profiles (id, full_name, role, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
    'client',
    v_color
  );
  insert into public.member_details (member_id) values (new.id)
  on conflict (member_id) do nothing;
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
  training_modality training_modality not null default 'individual',
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_class_sessions_starts_at on public.class_sessions(starts_at);
create index idx_class_sessions_trainer on public.class_sessions(trainer_id);
-- Acelera la búsqueda de solapamientos (starts_at < X and ends_at > Y)
-- que hace trg_check_concurrent_sessions en cada inserción/edición.
create index idx_class_sessions_range on public.class_sessions(starts_at, ends_at) where not is_cancelled;

-- ---------------------------------------------------------
-- 5. BOOKINGS (reservas de clientes a sesiones)
-- ---------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- Referencia al horario recurrente que generó esta reserva (NULL si
  -- es una reserva suelta hecha a mano). Solo para trazabilidad: ver
  -- qué sesiones vienen de un patrón, o cuántas van quedando. NO se
  -- usa para decidir permisos ni para cascada de cancelación — cada
  -- sesión generada se gestiona de forma independiente a partir de
  -- ahí (el cliente puede cancelar/mover cada una por separado).
  recurring_schedule_id uuid,
  unique (session_id, client_id) -- un cliente no puede reservar la misma sesión dos veces
);

create index idx_bookings_session on public.bookings(session_id);
create index idx_bookings_client on public.bookings(client_id);
create index idx_bookings_recurring_schedule on public.bookings(recurring_schedule_id)
  where recurring_schedule_id is not null;

-- Límite de cancelación/modificación: horas mínimas antes de la clase
-- para poder cancelar o modificar una reserva (constante fácil de
-- cambiar en un solo sitio).
create function public.cancellation_limit_hours()
returns int language sql immutable as $$ select 12 $$;

-- Límite especial para MOVER (no cancelar) una reserva conservando el
-- bono: si quedan al menos estas horas Y la nueva sesión cae dentro de
-- la misma semana (lunes-domingo) que la sesión original, el cliente
-- no pierde el bono al reprogramar. Fuera de esta ventana, mover
-- equivale a cancelar + reservar de nuevo (si cancela, pierde el bono).
create function public.reschedule_same_week_limit_hours()
returns int language sql immutable as $$ select 5 $$;

-- Aforo máximo físico de un entrenamiento de grupo ("custom_group").
-- Debe coincidir con MAX_GROUP_CAPACITY en lib/types/database.ts.
create function public.max_group_capacity()
returns int language sql immutable as $$ select 7 $$;

-- Número máximo de entrenamientos que pueden solaparse en el mismo
-- tramo horario (límite de espacio/material del gimnasio).
-- Debe coincidir con MAX_CONCURRENT_SESSIONS en lib/types/database.ts.
create function public.max_concurrent_sessions()
returns int language sql immutable as $$ select 2 $$;

-- ---------------------------------------------------------
-- 5b. HORARIOS RECURRENTES (reservas fijas semana a semana)
--
-- Un entrenador configura, desde el perfil de un cliente, su patrón
-- de horario fijo: p.ej. "lunes y miércoles a las 8:30, 4 semanas".
-- recurring_schedules guarda la plantilla en sí; cada combinación
-- día-de-la-semana + hora vive en recurring_schedule_slots (así un
-- cliente puede tener más de un día/hora en el mismo patrón).
--
-- Al crear el patrón se generan de golpe TODAS las class_sessions y
-- bookings necesarias (ver create_recurring_schedule() más abajo), así
-- que estas tablas son solo la plantilla/registro de lo que se pidió,
-- no algo que un job recorra periódicamente para ir creando sesiones.
-- ---------------------------------------------------------
create table public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  training_modality training_modality not null default 'individual',
  max_capacity int not null check (max_capacity > 0),
  weeks int not null check (weeks between 1 and 26),
  starts_on date not null, -- lunes de la primera semana del patrón
  name text not null default 'Entrenamiento',
  created_at timestamptz not null default now()
);

create table public.recurring_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.recurring_schedules(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0=domingo ... 6=sábado, igual que classes.recurring_weekday
  start_time time not null,
  duration_minutes int not null default 60 check (duration_minutes > 0)
);

create index idx_recurring_schedules_client on public.recurring_schedules(client_id);
create index idx_recurring_schedule_slots_schedule on public.recurring_schedule_slots(schedule_id);

-- ---------------------------------------------------------
-- Crear un horario recurrente: genera de golpe todas las sesiones y
-- reservas para los instantes indicados.
--
-- A diferencia del resto de horarios de la app, aquí el cálculo de
-- fecha+hora NO se hace en SQL: el entrenador elige los días y la
-- hora en su navegador, y es el propio navegador (igual que ya hace
-- CrearClaseModal.tsx con `new Date(...).toISOString()`) quien
-- resuelve correctamente el desfase horario local → UTC. Hacer ese
-- cálculo en PL/pgSQL con literales de fecha+hora sería ambiguo (no
-- sabríamos con certeza en qué timezone interpretar "8:30"), así que
-- el backend ya manda la lista completa de pares starts_at/ends_at en
-- UTC explícito (timestamptz), uno por cada sesión a crear. Esta
-- función se limita a aplicar las reglas de negocio sobre esa lista.
--
-- p_occurrences es un array de objetos en JSON, por ejemplo:
--   '[{"weekday":1,"starts_at":"2025-01-06T07:30:00Z","ends_at":"2025-01-06T08:30:00Z"},
--     {"weekday":3,"starts_at":"2025-01-08T07:30:00Z","ends_at":"2025-01-08T08:30:00Z"}]'
-- (weekday es solo informativo, para devolverlo en el resultado.)
--
-- Para cada ocurrencia:
--   1. Si ya existe una class_session de ese entrenador exactamente a
--      esa hora (mismo starts_at/ends_at) y con hueco, reutiliza esa
--      sesión en vez de crear una duplicada (p.ej. si el entrenador ya
--      tenía una clase de grupo a esa hora).
--   2. Si no existe, crea una nueva class_session (respetando el
--      límite de solapamiento vía el trigger ya existente
--      trg_check_concurrent_sessions).
--   3. Reserva al cliente en esa sesión (respetando aforo vía
--      trg_check_capacity, y descontando 1 bono vía
--      trg_sync_booking_credit, que ya existía).
--
-- Si una ocurrencia concreta falla (sin hueco, choque de horario, sin
-- bonos suficientes...), esa sesión en particular simplemente no se
-- crea y se informa en el resultado; el resto del patrón sigue
-- adelante con normalidad (cada iteración corre en su propio bloque
-- con EXCEPTION, que en PL/pgSQL actúa como un savepoint: un fallo ahí
-- solo deshace esa iteración, no las anteriores ya confirmadas).
-- ---------------------------------------------------------
create or replace function public.create_recurring_schedule(
  p_client_id uuid,
  p_training_modality training_modality,
  p_max_capacity int,
  p_weeks int,
  p_starts_on date,
  p_occurrences jsonb,
  p_name text default 'Entrenamiento'
)
returns table (
  weekday int,
  starts_at timestamptz,
  created boolean,
  session_id uuid,
  booking_id uuid,
  error_message text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_trainer_id uuid := auth.uid();
  v_schedule_id uuid;
  v_occ jsonb;
  v_weekday int;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_session_id uuid;
  v_booking_id uuid;
  v_existing_capacity int;
  v_existing_taken int;
  v_seen_slots jsonb := '[]'::jsonb;
  v_slot_key text;
begin
  if not public.is_trainer() then
    raise exception 'Solo los entrenadores pueden configurar horarios recurrentes';
  end if;

  if not exists (select 1 from public.profiles where id = p_client_id and role = 'client') then
    raise exception 'El cliente no existe';
  end if;

  if jsonb_array_length(p_occurrences) = 0 then
    raise exception 'Hay que indicar al menos un día y hora';
  end if;

  insert into public.recurring_schedules
    (client_id, trainer_id, training_modality, max_capacity, weeks, starts_on, name)
  values
    (p_client_id, v_trainer_id, p_training_modality, p_max_capacity, p_weeks, p_starts_on, coalesce(nullif(trim(p_name), ''), 'Entrenamiento'))
  returning id into v_schedule_id;

  for v_occ in select * from jsonb_array_elements(p_occurrences)
  loop
    v_weekday := (v_occ->>'weekday')::int;
    v_starts_at := (v_occ->>'starts_at')::timestamptz;
    v_ends_at := (v_occ->>'ends_at')::timestamptz;
    v_session_id := null;
    v_booking_id := null;

    -- Registramos cada combinación día-de-la-semana + hora UNA sola
    -- vez en recurring_schedule_slots (es la "plantilla"; las
    -- distintas semanas comparten el mismo slot).
    v_slot_key := v_weekday || '|' || (v_occ->>'starts_at')::timestamptz::time;
    if not (v_seen_slots ? v_slot_key) then
      insert into public.recurring_schedule_slots (schedule_id, weekday, start_time, duration_minutes)
      values (
        v_schedule_id,
        v_weekday,
        v_starts_at::time,
        extract(epoch from (v_ends_at - v_starts_at))::int / 60
      );
      v_seen_slots := v_seen_slots || to_jsonb(v_slot_key);
    end if;

    begin
      -- ¿Ya existe una sesión de este entrenador exactamente a esa
      -- hora, con hueco? La reutilizamos en vez de duplicarla.
      select cs.id, cs.max_capacity into v_session_id, v_existing_capacity
      from public.class_sessions cs
      where cs.trainer_id = v_trainer_id
        and cs.starts_at = v_starts_at
        and cs.ends_at = v_ends_at
        and not cs.is_cancelled
      limit 1;

      if v_session_id is not null then
        select count(*) into v_existing_taken
        from public.bookings
        where session_id = v_session_id and status = 'confirmed';

        if v_existing_taken >= v_existing_capacity then
          raise exception 'Ya hay una clase a esa hora y está completa';
        end if;
      else
        insert into public.class_sessions
          (trainer_id, name, max_capacity, training_modality, starts_at, ends_at)
        values
          (v_trainer_id, p_name, p_max_capacity, p_training_modality, v_starts_at, v_ends_at)
        returning id into v_session_id;
      end if;

      insert into public.bookings (session_id, client_id, recurring_schedule_id)
      values (v_session_id, p_client_id, v_schedule_id)
      returning id into v_booking_id;

      weekday := v_weekday;
      starts_at := v_starts_at;
      created := true;
      session_id := v_session_id;
      booking_id := v_booking_id;
      error_message := null;
      return next;
    exception when others then
      -- Un fallo en esta ocurrencia concreta (choque de horario, clase
      -- completa, sin bonos, etc.) no debe tirar abajo el resto del
      -- patrón: se informa y se continúa con la siguiente.
      weekday := v_weekday;
      starts_at := v_starts_at;
      created := false;
      session_id := null;
      booking_id := null;
      error_message := SQLERRM;
      return next;
    end;
  end loop;

  return;
end;
$$;

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
create or replace function public.check_capacity()
returns trigger
language plpgsql
as $$
declare
  v_capacity int;
  v_taken int;
  v_modality training_modality;
begin
  select max_capacity, training_modality
  into v_capacity, v_modality
  from public.class_sessions
  where id = new.session_id;

  if v_capacity is null then
    raise exception 'La sesión no existe';
  end if;

  select count(*) into v_taken
  from public.bookings
  where session_id = new.session_id
    and status = 'confirmed';

  if v_taken >= v_capacity then
    raise exception 'La clase está completa (aforo: %)', v_capacity;
  end if;

  if v_modality = 'individual' and v_capacity <> 1
    or v_modality = 'duo' and v_capacity <> 2
    or v_modality = 'group3' and v_capacity <> 3
    or v_modality = 'group4' and v_capacity <> 4
    or v_modality = 'custom_group' and (v_capacity < 5 or v_capacity > public.max_group_capacity()) then
    raise exception 'El aforo no coincide con la modalidad de entrenamiento';
  end if;

  return new;
end;
$$;

create trigger trg_check_capacity
  before insert on public.bookings
  for each row
  when (new.status = 'confirmed')
  execute procedure public.check_capacity();


-- Comprobar que no se superan los entrenamientos simultáneos permitidos.
-- El gimnasio solo tiene espacio/material para max_concurrent_sessions()
-- a la vez, sea cual sea la modalidad. Se aplica tanto al crear una
-- sesión como al reprogramar su horario; las sesiones canceladas no
-- cuentan. Esta comprobación vive también en app/api/sesiones/route.ts,
-- pero se repite aquí como red de seguridad ante condiciones de carrera
-- (dos creaciones casi simultáneas) o inserciones que no pasen por el API.
create or replace function public.check_concurrent_sessions()
returns trigger
language plpgsql
as $$
declare
  v_overlapping int;
begin
  if new.is_cancelled then
    return new;
  end if;

  select count(*) into v_overlapping
  from public.class_sessions s
  where not s.is_cancelled
    and s.id <> new.id
    and s.starts_at < new.ends_at
    and s.ends_at > new.starts_at;

  if v_overlapping >= public.max_concurrent_sessions() then
    raise exception 'Ya hay % entrenamientos en ese horario; el gimnasio no puede atender más a la vez', public.max_concurrent_sessions();
  end if;

  return new;
end;
$$;

create trigger trg_check_concurrent_sessions
  before insert or update of starts_at, ends_at, is_cancelled on public.class_sessions
  for each row
  execute procedure public.check_concurrent_sessions();


-- Comprobar límite de cancelación
create function public.check_cancellation_window()
returns trigger
language plpgsql
as $$
declare
  v_starts_at timestamptz;
begin
  if new.status = 'cancelled' and old.status = 'confirmed' then
    -- Si la cancelación viene de cancel_session_as_trainer() (el
    -- entrenador cancela la clase entera), saltamos el límite de
    -- horas: no es una cancelación de última hora del cliente, es la
    -- clase la que deja de existir, y el bono debe devolverse sin
    -- importar cuánto falte para que empezara.
    if current_setting('app.bypass_cancellation_window', true) = 'on' then
      new.cancelled_at := now();
      return new;
    end if;

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


-- ---------------------------------------------------------
-- CONSUMO AUTOMÁTICO DE BONOS
-- Una reserva consume 1 sesión; una cancelación válida la devuelve.
-- ---------------------------------------------------------
create function public.sync_booking_credit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance int;
  v_skip_credit_sync boolean;
begin
  -- reschedule_booking() activa esta bandera cuando mueve una reserva
  -- dentro de las condiciones que conservan el bono (misma semana, con
  -- al menos reschedule_same_week_limit_hours() de antelación): ni la
  -- cancelación de la reserva vieja debe devolver el bono, ni la
  -- creación de la nueva debe descontarlo, porque conceptualmente es
  -- la misma sesión sin más que cambia de horario.
  v_skip_credit_sync := current_setting('app.bypass_credit_charge', true) = 'on';

  if v_skip_credit_sync then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    insert into public.member_details (member_id) values (new.client_id)
    on conflict (member_id) do nothing;
    select class_credits into v_balance from public.member_details
      where member_id = new.client_id for update;
    if v_balance < 1 then
      raise exception 'No tienes bonos disponibles para reservar esta sesión';
    end if;
    update public.member_details set class_credits = class_credits - 1, updated_at = now()
      where member_id = new.client_id;
    insert into public.class_credit_movements(member_id, trainer_id, delta, balance_after, reason)
      select new.client_id, s.trainer_id, -1, v_balance - 1, 'Reserva de sesión'
      from public.class_sessions s where s.id = new.session_id;
  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status = 'cancelled' then
    insert into public.member_details (member_id) values (new.client_id)
    on conflict (member_id) do nothing;
    select class_credits into v_balance from public.member_details
      where member_id = new.client_id for update;
    update public.member_details set class_credits = class_credits + 1, updated_at = now()
      where member_id = new.client_id;
    insert into public.class_credit_movements(member_id, trainer_id, delta, balance_after, reason)
      select new.client_id, s.trainer_id, 1, v_balance + 1, 'Devolución por cancelación'
      from public.class_sessions s where s.id = new.session_id;
  elsif tg_op = 'UPDATE' and old.status = 'cancelled' and new.status = 'confirmed' then
    insert into public.member_details (member_id) values (new.client_id)
    on conflict (member_id) do nothing;
    select class_credits into v_balance from public.member_details
      where member_id = new.client_id for update;
    if v_balance < 1 then
      raise exception 'No tienes bonos disponibles para reactivar esta reserva';
    end if;
    update public.member_details set class_credits = class_credits - 1, updated_at = now()
      where member_id = new.client_id;
    insert into public.class_credit_movements(member_id, trainer_id, delta, balance_after, reason)
      select new.client_id, s.trainer_id, -1, v_balance - 1, 'Reactivación de reserva'
      from public.class_sessions s where s.id = new.session_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_booking_credit
  after insert or update of status on public.bookings
  for each row execute procedure public.sync_booking_credit();


-- ---------------------------------------------------------
-- CANCELAR UNA CLASE COMO ENTRENADOR
-- Marca la sesión como cancelada y, a la vez, cancela todas las
-- reservas confirmadas de esa sesión. Al cancelarlas, el trigger
-- trg_sync_booking_credit (ya existente) devuelve automáticamente el
-- bono a cada cliente apuntado. Todo ocurre en una sola transacción:
-- si algo falla a mitad, no queda una clase cancelada con reservas a
-- medio devolver.
-- ---------------------------------------------------------
create or replace function public.cancel_session_as_trainer(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_trainer_id uuid;
begin
  -- Solo el entrenador dueño de la sesión puede cancelarla. No usamos
  -- solo RLS aquí porque esta función corre como security definer
  -- (necesita permiso para tocar bookings de otros usuarios), así que
  -- la comprobación de propiedad se hace a mano.
  select trainer_id into v_trainer_id
  from public.class_sessions
  where id = p_session_id;

  if v_trainer_id is null then
    raise exception 'La clase no existe';
  end if;

  if v_trainer_id <> auth.uid() then
    raise exception 'Solo el entrenador de esta clase puede cancelarla';
  end if;

  update public.class_sessions
  set is_cancelled = true
  where id = p_session_id;

  -- Saltamos el límite de horas de cancelación: es el entrenador
  -- cancelando la clase entera, no el cliente cancelando su reserva.
  perform set_config('app.bypass_cancellation_window', 'on', true);

  update public.bookings
  set status = 'cancelled'
  where session_id = p_session_id
    and status = 'confirmed';
end;
$$;


-- ---------------------------------------------------------
-- MOVER UNA RESERVA (reprogramar)
--
-- Reglas:
--  - Si quedan MENOS de cancellation_limit_hours() (12h) para la
--    sesión actual, no se puede mover en absoluto (misma ventana que
--    para cancelar).
--  - Si quedan AL MENOS reschedule_same_week_limit_hours() (5h) para
--    la sesión actual Y la nueva sesión cae en la misma semana
--    (lunes-domingo) que la sesión actual, el cliente CONSERVA el
--    bono: se cancela la reserva vieja y se crea la nueva sin que el
--    saldo de bonos se mueva en ningún momento (no se devuelve ni se
--    descuenta), para que quede claro en el historial que es la misma
--    sesión, solo que reprogramada.
--  - En cualquier otro caso (p.ej. mueve a otra semana, o no cumple
--    el margen de 5h aunque sea dentro de la misma semana), mover
--    equivale a cancelar + reservar de nuevo: se devuelve el bono al
--    cancelar la reserva vieja (si cumple la ventana de 12h) y se
--    descuenta de nuevo uno al crear la reserva nueva.
--
-- Ambas reservas (la vieja cancelada y la nueva) quedan en la misma
-- transacción: si la nueva sesión no tiene hueco, no se pierde ni se
-- toca la reserva original.
-- ---------------------------------------------------------
create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_new_session_id uuid
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_client_id uuid;
  v_old_session_id uuid;
  v_old_starts_at timestamptz;
  v_new_starts_at timestamptz;
  v_hours_until_old numeric;
  v_same_week boolean;
  v_keep_credit boolean;
  v_new_booking_id uuid;
begin
  select b.client_id, b.session_id, s.starts_at
  into v_client_id, v_old_session_id, v_old_starts_at
  from public.bookings b
  join public.class_sessions s on s.id = b.session_id
  where b.id = p_booking_id and b.status = 'confirmed';

  if v_client_id is null then
    raise exception 'La reserva no existe o ya no está confirmada';
  end if;

  if v_client_id <> auth.uid() then
    raise exception 'Solo puedes mover tus propias reservas';
  end if;

  select starts_at into v_new_starts_at
  from public.class_sessions
  where id = p_new_session_id and not is_cancelled;

  if v_new_starts_at is null then
    raise exception 'La nueva sesión no existe o está cancelada';
  end if;

  if p_new_session_id = v_old_session_id then
    raise exception 'Elige un horario distinto al actual';
  end if;

  v_hours_until_old := extract(epoch from (v_old_starts_at - now())) / 3600;

  if v_hours_until_old < public.cancellation_limit_hours() then
    raise exception 'No se puede modificar: quedan menos de % horas para la clase', public.cancellation_limit_hours();
  end if;

  -- Misma semana = mismo lunes-domingo. date_trunc('week', ...) en
  -- Postgres ya considera el lunes como inicio de semana (ISO 8601),
  -- igual que getWeekDays() en el frontend (weekStartsOn: 1).
  v_same_week := date_trunc('week', v_old_starts_at) = date_trunc('week', v_new_starts_at);
  v_keep_credit := v_same_week and v_hours_until_old >= public.reschedule_same_week_limit_hours();

  if v_keep_credit then
    -- Ni la cancelación de la reserva vieja (más abajo) debe devolver
    -- el bono, ni la creación de la nueva debe descontarlo: ambas
    -- banderas se activan ANTES de tocar bookings, para que
    -- sync_booking_credit() las vea en las dos operaciones.
    perform set_config('app.bypass_cancellation_window', 'on', true);
    perform set_config('app.bypass_credit_charge', 'on', true);
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  insert into public.bookings (session_id, client_id, recurring_schedule_id)
  select p_new_session_id, v_client_id, b.recurring_schedule_id
  from public.bookings b where b.id = p_booking_id
  returning id into v_new_booking_id;

  return v_new_booking_id;
end;
$$;

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
alter table public.recurring_schedules enable row level security;
alter table public.recurring_schedule_slots enable row level security;

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

-- ---- RECURRING_SCHEDULES / RECURRING_SCHEDULE_SLOTS ----
-- Solo el entrenador que lo creó y el cliente al que pertenece pueden
-- verlo; solo el entrenador puede crearlo (vía create_recurring_schedule,
-- que además valida is_trainer() por su cuenta).
create policy "recurring_schedules_select_own" on public.recurring_schedules
  for select using (client_id = auth.uid() or trainer_id = auth.uid());

create policy "recurring_schedule_slots_select_own" on public.recurring_schedule_slots
  for select using (
    exists (
      select 1 from public.recurring_schedules rs
      where rs.id = schedule_id and (rs.client_id = auth.uid() or rs.trainer_id = auth.uid())
    )
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
-- MIEMBROS: BONOS DE CLASES
--
-- Se guardan en una tabla aparte (member_details) y NO en
-- profiles, porque profiles es legible por todos los usuarios
-- autenticados. Solo pueden leer esta tabla los entrenadores y
-- el propio miembro (su saldo).
--
-- Los bonos NO se pueden modificar con un UPDATE directo: solo
-- a través de adjust_class_credits(), que exige rol entrenador,
-- bloquea la fila (sin condiciones de carrera), impide saldos
-- negativos y deja registro en class_credit_movements.
-- =========================================================

create table if not exists public.member_details (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  class_credits int not null default 0 check (class_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_credit_movements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  delta int not null check (delta <> 0),
  balance_after int not null check (balance_after >= 0),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_movements_member
  on public.class_credit_movements (member_id, created_at desc);

alter table public.member_details enable row level security;
alter table public.class_credit_movements enable row level security;

drop policy if exists "member_details_select_own_or_trainer" on public.member_details;
create policy "member_details_select_own_or_trainer" on public.member_details
  for select using (member_id = auth.uid() or public.is_trainer());

drop policy if exists "credit_movements_select_own_or_trainer" on public.class_credit_movements;
create policy "credit_movements_select_own_or_trainer" on public.class_credit_movements
  for select using (member_id = auth.uid() or public.is_trainer());

-- Los entrenadores pueden ver las reservas de TODAS las clases (para
-- consultar los miembros de las clases de otros entrenadores).
-- Las policies permisivas se combinan con OR, así que no afecta a
-- lo que ya podía ver un cliente.
drop policy if exists "bookings_select_all_trainers" on public.bookings;
create policy "bookings_select_all_trainers" on public.bookings
  for select using (public.is_trainer());

-- Ajustar bonos (suma o resta). Devuelve el nuevo saldo.
create or replace function public.adjust_class_credits(
  p_member uuid,
  p_delta int,
  p_reason text default null
)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_current int;
  v_new int;
begin
  if not public.is_trainer() then
    raise exception 'Solo los entrenadores pueden modificar los bonos';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'La variación de bonos debe ser distinta de 0';
  end if;
  if abs(p_delta) > 100 then
    raise exception 'No se pueden modificar más de 100 bonos de una vez';
  end if;
  if not exists (select 1 from public.profiles where id = p_member and role = 'client') then
    raise exception 'El miembro no existe';
  end if;

  insert into public.member_details (member_id) values (p_member)
  on conflict (member_id) do nothing;

  select class_credits into v_current
  from public.member_details where member_id = p_member for update;

  v_new := v_current + p_delta;
  if v_new < 0 then
    raise exception 'El miembro solo tiene % bonos, no se pueden restar %', v_current, abs(p_delta);
  end if;

  update public.member_details
  set class_credits = v_new, updated_at = now()
  where member_id = p_member;

  insert into public.class_credit_movements (member_id, trainer_id, delta, balance_after, reason)
  values (p_member, auth.uid(), p_delta, v_new, nullif(trim(p_reason), ''));

  return v_new;
end;
$$;

-- El trigger de alta también crea la ficha de bonos del miembro.
--
-- OJO: esta es la segunda definición de handle_new_user() en este
-- fichero (la primera está más arriba, junto a la tabla profiles).
-- Con "create or replace" esta es la que de verdad queda activa al
-- ejecutar schema.sql entero, así que el rol NUNCA se toma de
-- raw_user_meta_data aquí tampoco (ver el comentario en la primera
-- definición): un registro anterior de este archivo volvía a leer
-- el rol del propio usuario y reabría el agujero de seguridad que ya
-- se había cerrado en la primera definición.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
    'client'
  );

  insert into public.member_details (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  return new;
end;
$$;

-- Fichas para los usuarios que ya existían
insert into public.member_details (member_id)
select id from public.profiles
on conflict (member_id) do nothing;

grant all on public.member_details, public.class_credit_movements
  to anon, authenticated, service_role;

-- =========================================================
-- RESERVAS: volver a reservar una clase cancelada
--
-- Cancelar una reserva solo cambia su estado a 'cancelled' (la fila
-- se conserva y por eso unique(session_id, client_id) impedía volver a
-- reservar). La app ahora REACTIVA esa fila (cancelled -> confirmed).
-- El trigger de aforo solo saltaba en INSERT, así que aquí se amplía
-- a esa transición para que cancelar y reservar de nuevo no permita
-- superar el aforo.
-- =========================================================
create or replace function public.check_capacity_on_reactivate()
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
  where session_id = new.session_id and status = 'confirmed' and id <> new.id;

  if v_taken >= v_capacity then
    raise exception 'La clase está completa (aforo: %)', v_capacity;
  end if;

  new.cancelled_at := null;
  return new;
end;
$$;

drop trigger if exists trg_check_capacity_reactivate on public.bookings;
create trigger trg_check_capacity_reactivate
  before update of status on public.bookings
  for each row
  when (old.status = 'cancelled' and new.status = 'confirmed')
  execute procedure public.check_capacity_on_reactivate();

-- =========================================================
-- FIN DEL ESQUEMA
-- =========================================================
