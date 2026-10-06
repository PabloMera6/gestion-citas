-- Añade dos límites de negocio:
--   1. Un entrenamiento de grupo ("custom_group") no puede superar las
--      max_group_capacity() personas (7).
--   2. No pueden solaparse en el tiempo más de max_concurrent_sessions()
--      entrenamientos (2), de ninguna modalidad: el gimnasio no tiene
--      espacio/material para más.
--
-- Pégalo entero en el SQL Editor de Supabase y ejecútalo una vez.

-- 1. Constantes nuevas ---------------------------------------------

create function public.max_group_capacity()
returns int language sql immutable as $$ select 7 $$;

create function public.max_concurrent_sessions()
returns int language sql immutable as $$ select 2 $$;

-- 2. Actualiza el trigger existente de aforo por modalidad ----------
-- (añade el tope máximo de custom_group, que antes no tenía límite superior)

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

-- 3. Nuevo trigger: máximo de entrenamientos solapados --------------

create index if not exists idx_class_sessions_range
  on public.class_sessions(starts_at, ends_at)
  where not is_cancelled;

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

drop trigger if exists trg_check_concurrent_sessions on public.class_sessions;
create trigger trg_check_concurrent_sessions
  before insert or update of starts_at, ends_at, is_cancelled on public.class_sessions
  for each row
  execute procedure public.check_concurrent_sessions();
