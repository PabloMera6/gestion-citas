# Cambios Bíbelo

## Base de datos
- Si es una instalación nueva, usar `supabase/schema.sql`.
- Si ya existe una base de datos con datos, ejecutar `supabase/migracion_bonos.sql` en Supabase SQL Editor.
- La migración añade modalidades, colores de entrenadores y consumo/devolución automática de bonos.

## Modalidades
- Individual: 1
- Dúo: 2
- Grupal: 3
- Grupal: 4
- Grupo de más personas: 5 o más, con aforo configurable.

## Bonos
Los profesionales activan manualmente bonos desde Miembros. Hay accesos rápidos de 4, 8 y 12 sesiones y se puede introducir una cantidad personalizada. Las reservas consumen una sesión y una cancelación válida devuelve la sesión.

## Logo
Se incluye `public/Bibelo.jpg`, usando el logo Bíbelo presente en el proyecto.

## Verificación
La compilación completa no se pudo ejecutar en este entorno porque las dependencias npm no estaban disponibles en caché y el entorno no pudo descargar el registro de npm. Se hizo comprobación estática con TypeScript; los errores restantes proceden de módulos/dependencias ausentes, no de una incompatibilidad detectada en los cambios.
