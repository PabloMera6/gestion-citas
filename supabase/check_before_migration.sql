-- Ejecuta esto ANTES de aplicar fix_group_and_concurrency_limits.sql,
-- para comprobar si hay datos ya existentes que romperían las reglas nuevas.
-- Si ambas consultas devuelven 0 filas, puedes aplicar la migración sin más.

-- ¿Algún grupo con más de 7 personas?
select id, name, max_capacity
from public.class_sessions
where training_modality = 'custom_group'
  and max_capacity > 7
  and not is_cancelled;

-- ¿Algún tramo horario con más de 2 sesiones activas solapadas?
select a.id, a.name, a.starts_at, a.ends_at, count(*) as solapes
from public.class_sessions a
join public.class_sessions b
  on a.id <> b.id
  and not b.is_cancelled
  and a.starts_at < b.ends_at
  and a.ends_at > b.starts_at
where not a.is_cancelled
group by a.id, a.name, a.starts_at, a.ends_at
having count(*) >= 2
order by a.starts_at;
