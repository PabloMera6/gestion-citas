# MiGym — App de reservas para gimnasio

Next.js + Supabase. Login, roles (entrenador/cliente), calendario de clases,
reservas con control de aforo, tablón de anuncios y horario de entrenadores.

## Puesta en marcha

1. **Base de datos**: crea un proyecto gratis en [supabase.com](https://supabase.com),
   ve a `SQL Editor` y ejecuta el contenido de `schema.sql` (entregado en el paso 1).

2. **Variables de entorno**: copia `.env.local.example` como `.env.local` y
   rellena con los datos de tu proyecto Supabase (`Project Settings > API`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Instalar y arrancar en local**:
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:3000

4. **Desplegar gratis**: sube este proyecto a un repositorio de GitHub e
   impórtalo en [vercel.com](https://vercel.com) (plan gratuito). Añade las
   mismas variables de entorno en el panel de Vercel. Cada `git push` despliega
   automáticamente.

## Estado actual (v1)

- Registro/login con rol (entrenador o cliente)
- Sesion protegida por middleware
- Estructura de navegacion (Calendario, Tablon, Entrenadores, Mis reservas)
- Calendario real de sesiones desde `sessions_with_availability`
- Reserva de clases con control de aforo atómico mediante RPC de Supabase
- Tablon de anuncios -- siguiente paso
- Vista de horario por entrenador -- siguiente paso


## Paso 3: calendario y reservas

1. Ejecuta `supabase/migrations/202609210001_step3_booking.sql` en el SQL Editor de Supabase.
2. Comprueba que la vista `sessions_with_availability` devuelve al menos:
   `id`, `name`, `description`, `max_capacity`, `starts_at`, `ends_at`,
   `is_cancelled`, `trainer_name`, `available_spots`.
3. En local, configura `.env.local` y ejecuta `npm install && npm run build`.
4. La ruta `/calendario` muestra la semana y las sesiones reales. El botón
   `Reservar` llama a `/api/reservas`; el RPC bloquea la sesión durante la
   comprobación e inserción, evitando sobrepasar el aforo con reservas
   simultáneas.
