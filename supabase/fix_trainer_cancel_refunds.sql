-- Hace que, cuando un ENTRENADOR cancela una clase entera, se cancelen
-- automáticamente las reservas confirmadas de esa clase y se devuelva
-- el bono a cada cliente apuntado (usando el trigger de devolución de
-- bonos que ya existe, sync_booking_credit()).
--
-- Pégalo entero en el SQL Editor de Supabase y ejecútalo una vez.

-- 1. El trigger de ventana de cancelación debe poder saltarse el
--    límite de horas cuando la cancelación la origina el entrenador
--    (cancela la clase entera), no el cliente cancelando su reserva.
create or replace function public.check_cancellation_window()
returns trigger
language plpgsql
as $$
declare
  v_starts_at timestamptz;
begin
  if new.status = 'cancelled' and old.status = 'confirmed' then
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

-- 2. Función que el entrenador usa para cancelar su clase: marca la
--    sesión como cancelada y cancela todas sus reservas confirmadas
--    en una sola transacción. trg_sync_booking_credit (ya existente)
--    se encarga de devolver el bono a cada cliente.
create or replace function public.cancel_session_as_trainer(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_trainer_id uuid;
begin
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

  perform set_config('app.bypass_cancellation_window', 'on', true);

  update public.bookings
  set status = 'cancelled'
  where session_id = p_session_id
    and status = 'confirmed';
end;
$$;
