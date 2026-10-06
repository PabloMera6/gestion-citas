-- Evita que el registro público pueda autoasignarse el rol 'trainer'.
-- Antes, handle_new_user() leía raw_user_meta_data->>'role' (lo que
-- mandaba el propio formulario de registro, o cualquiera llamando a la
-- API de signUp directamente) y lo usaba tal cual. Ahora todo registro
-- público entra siempre como 'client'.
--
-- Para subir a alguien a entrenador, hazlo a mano después de que se
-- registre como cliente:
--   update public.profiles set role = 'trainer' where id = '<uuid del usuario>';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_color text;
begin
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
