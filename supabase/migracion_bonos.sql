-- =========================================================
-- MIGRACIÓN INCREMENTAL: bonos de clases + reservas visibles
-- para entrenadores. NO borra datos: se puede ejecutar sobre una
-- base ya en uso (Supabase > SQL Editor). Es idempotente.
-- Si partes de cero, basta con ejecutar schema.sql (ya lo incluye).
-- =========================================================

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

-- Limpieza por si se ejecutó una versión anterior de esta migración con DNI
drop function if exists public.set_my_dni(text);
drop index if exists public.idx_member_details_dni;

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

-- El trigger de alta también crea la ficha de bonos del miembro
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
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
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

alter table public.member_details drop column if exists dni;

grant all on public.member_details, public.class_credit_movements
  to anon, authenticated, service_role;
