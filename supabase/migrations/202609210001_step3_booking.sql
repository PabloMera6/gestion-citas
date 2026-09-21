-- Paso 3: reserva atómica con control de aforo.
-- Este script presupone que el esquema del paso 1 ya creó:
--   public.class_sessions(id, starts_at, is_cancelled, max_capacity)
--   public.bookings(id, session_id, client_id, status, created_at, cancelled_at)
-- y que status = 'confirmed' representa una reserva activa.

create or replace function public.book_class_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.class_sessions%rowtype;
  v_confirmed integer;
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- Bloqueamos la fila de la sesión para que dos reservas simultáneas
  -- no puedan superar el aforo.
  select *
    into v_session
    from public.class_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SESSION_NOT_FOUND';
  end if;

  if v_session.is_cancelled then
    raise exception using errcode = 'P0001', message = 'SESSION_CANCELLED';
  end if;

  if v_session.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'SESSION_STARTED';
  end if;

  select count(*)::integer
    into v_confirmed
    from public.bookings
   where session_id = p_session_id
     and status = 'confirmed';

  if v_confirmed >= v_session.max_capacity then
    raise exception using errcode = 'P0001', message = 'SESSION_FULL';
  end if;

  select *
    into v_booking
    from public.bookings
   where session_id = p_session_id
     and client_id = v_user_id
     and status = 'confirmed'
   limit 1;

  if found then
    raise exception using errcode = 'P0001', message = 'ALREADY_BOOKED';
  end if;

  insert into public.bookings (session_id, client_id, status)
  values (p_session_id, v_user_id, 'confirmed')
  returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id,
    'session_id', v_booking.session_id,
    'status', v_booking.status,
    'created_at', v_booking.created_at
  );
end;
$$;

revoke all on function public.book_class_session(uuid) from public;
grant execute on function public.book_class_session(uuid) to authenticated;
