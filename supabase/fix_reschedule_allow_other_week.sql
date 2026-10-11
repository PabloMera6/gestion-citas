-- Revierte la restricción total de "solo misma semana" en
-- reschedule_booking(): mover una reserva a otra semana SÍ está
-- permitido de nuevo, pero cuenta como cancelar y reservar de nuevo
-- (se gasta un bono nuevo). La protección frente a pulsaciones
-- accidentales se hace ahora en el frontend, con un aviso de
-- confirmación explícito cuando el destino elegido cae en otra
-- semana, antes de llamar a este RPC.
--
-- Solo hace falta ejecutar esto si ya habías aplicado
-- fix_reschedule_same_week_only.sql anteriormente. Si no lo habías
-- aplicado, este archivo no es necesario: basta con que schema.sql
-- esté actualizado para proyectos nuevos.
--
-- Pégalo entero en el SQL Editor de Supabase y ejecútalo una vez.

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
