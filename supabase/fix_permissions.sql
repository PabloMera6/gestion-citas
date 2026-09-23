-- =========================================================
-- FIX: "permission denied for table profiles" (y para el resto
-- de tablas del esquema public)
--
-- Causa: el `drop schema if exists public cascade;` de schema.sql
-- borra también los GRANTs base que Supabase configura sobre el
-- esquema public para los roles anon/authenticated. RLS (las
-- policies) es una capa aparte: aunque las policies estén bien,
-- sin estos GRANTs el rol ni siquiera puede intentar tocar la
-- tabla, y Postgres devuelve "permission denied" antes de llegar
-- a evaluar ninguna policy.
--
-- Ejecuta esto UNA VEZ después de haber corrido schema.sql.
-- =========================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Para que las tablas que se creen en el futuro en este esquema
-- también reciban estos permisos automáticamente, sin tener que
-- repetir este script cada vez.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
