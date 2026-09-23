# MiGym — Gestión de clases, reservas y entrenadores

App tipo TIMP para un gimnasio con varios entrenadores personales: calendario
semanal de clases, reservas con control de aforo, tablón de anuncios y
horario público de cada entrenador. Hecha con Next.js 16 (App Router) +
Supabase (auth, base de datos y RLS).

## 1. Base de datos

Hay un único archivo de esquema: `supabase/schema.sql`. No hay migraciones
que ejecutar en orden ni versiones parciales — este archivo es la fuente de
verdad completa.

**Cómo ejecutarlo:**

1. Entra en tu proyecto de [supabase.com](https://supabase.com).
2. En el menú lateral, abre **SQL Editor**.
3. Pulsa **New query**.
4. Abre `supabase/schema.sql` de este repositorio, copia todo su contenido y
   pégalo en el editor.
5. Pulsa **Run** (o `Cmd/Ctrl + Enter`).

Deberías ver "Success. No rows returned" al terminar.

⚠️ **Importante:** el script empieza con `drop schema if exists public cascade;`,
es decir, **borra todo lo que hubiera antes** en el esquema `public` (tablas,
vistas, funciones, y todos los datos que contuvieran) y lo vuelve a crear de
cero. Es intencionado: así siempre partes de un estado limpio y conocido, sin
arrastrar restos de versiones anteriores del esquema.

- Si es la primera vez o el proyecto está en desarrollo sin datos que te
  importe conservar → ejecútalo sin más.
- Si ya tienes usuarios o reservas reales que no quieres perder → **no
  ejecutes este script tal cual**; en ese punto conviene pasar a migraciones
  incrementales (`alter table`, etc.) en vez de un `drop` completo. Avísame
  cuando llegues ahí y te preparo ese cambio de estrategia.

Puedes volver a ejecutar este mismo archivo tantas veces como quieras durante
el desarrollo para reiniciar la base de datos a un estado limpio.

## 2. Variables de entorno

Copia `.env.local.example` como `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

(Supabase → Project Settings → API)

## 3. Instalar y arrancar

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## 4. Cómo se dan de alta los entrenadores (por ahora)

No hay un panel de administración todavía. Cada entrenador se registra igual
que un cliente, desde `/registro`, eligiendo el rol **Entrenador** en el
formulario. El perfil se crea automáticamente vía trigger. A partir de ahí,
**todo lo gestiona el propio entrenador desde la interfaz**, sin tocar
Supabase:

- **Mi perfil** (`/perfil`): nombre, teléfono, bio y color identificativo.
- **Grupos** (misma página, sección "Mis grupos de entrenamiento"): crear y
  eliminar grupos de entrenamiento.
- **Calendario**: crear clases (botón "+ Nueva clase" o clic en una franja
  horaria vacía), asignarlas opcionalmente a un grupo.

Cuando quieras, se puede añadir un rol `admin` con un panel para crear
cuentas de entrenador sin pasar por el registro público, asignar clientes a
grupos (la tabla `group_members` ya existe pero aún no hay pantalla para
gestionarla) y desactivar entrenadores o clases.

## Estructura

- `app/(app)/calendario` — calendario semanal por franjas horarias; crear clases (entrenador) y reservar plazas (cliente).
- `app/(app)/mis-reservas` — próximas reservas e historial del cliente, con cancelación (respeta la ventana de 4h del trigger `check_cancellation_window`).
- `app/(app)/tablon` — anuncios del gimnasio (solo entrenadores publican).
- `app/(app)/entrenadores` — horario semanal público de cada entrenador y sus grupos.
- `app/(app)/perfil` — edición de datos propios; si es entrenador, además gestión de grupos.
- `app/api/*` — endpoints para reservar, cancelar, crear/cancelar sesiones, crear anuncios, crear/editar/eliminar grupos, editar perfil.
- `supabase/schema.sql` — esquema completo de la base de datos.

## Cómo funciona el control de aforo y cancelación

No usamos funciones RPC personalizadas para esto: se apoya directamente en
triggers de Postgres:

- `trg_check_capacity` (antes de insertar una reserva) — lanza una excepción
  si la clase está completa. La API `/api/reservas` captura ese error y lo
  muestra como mensaje legible.
- `trg_check_cancellation` (antes de actualizar una reserva a `cancelled`) —
  impide cancelar con menos de `cancellation_limit_hours()` (4h) de
  antelación. La interfaz ya deshabilita el botón de cancelar cuando quedan
  menos de esas horas, para no depender solo del error del servidor.
- La restricción `unique(session_id, client_id)` en `bookings` impide que
  un cliente reserve dos veces la misma sesión; la API traduce el código de
  error `23505` a un mensaje claro.

## Notas de seguridad

- Todas las tablas tienen **Row Level Security** activada: un cliente solo
  puede leer/escribir sus propias reservas; solo el entrenador dueño de una
  clase o grupo puede editarlos; solo entrenadores pueden publicar anuncios
  (`is_trainer()`).
