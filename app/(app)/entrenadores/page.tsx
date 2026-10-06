import { getAuthContext } from "@/lib/auth-context";
import EntrenadorHorario from "@/components/EntrenadorHorario";
import { getWeekDays } from "@/lib/date";
import type {
  Group,
  Profile,
  SessionMember,
  SessionWithAvailability,
} from "@/lib/types/database";

// Forma de la fila que devuelve Supabase al anidar cliente + ficha de miembro
interface BookingRow {
  session_id: string;
  created_at: string;
  client: {
    id: string;
    full_name: string;
    phone: string | null;
    member_details:
      | { class_credits: number }
      | { class_credits: number }[]
      | null;
  } | null;
}

export default async function EntrenadoresPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) return null;

  const isTrainer = profile?.role === "trainer";

  const weekDays = getWeekDays(new Date());
  const weekStart = weekDays[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [{ data: trainers }, { data: groups }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "trainer")
        .order("full_name")
        .returns<Profile[]>(),
      supabase.from("groups").select("*").returns<Group[]>(),
      supabase
        .from("sessions_with_availability")
        .select("*")
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at")
        .returns<SessionWithAvailability[]>(),
    ]);

  // Los entrenadores pueden ver quién está apuntado a cualquier clase
  // (la policy bookings_select_all_trainers lo permite en la base de datos).
  const membersBySession: Record<string, SessionMember[]> = {};
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (isTrainer && sessionIds.length > 0) {
    const { data: rows } = await supabase
      .from("bookings")
      .select(
        "session_id, created_at, client:profiles(id, full_name, phone, member_details(class_credits))"
      )
      .in("session_id", sessionIds)
      .eq("status", "confirmed")
      .order("created_at")
      .returns<BookingRow[]>();

    for (const row of rows ?? []) {
      if (!row.client) continue;
      const details = Array.isArray(row.client.member_details)
        ? row.client.member_details[0]
        : row.client.member_details;
      (membersBySession[row.session_id] ??= []).push({
        id: row.client.id,
        full_name: row.client.full_name,
        phone: row.client.phone,
        class_credits: details?.class_credits ?? 0,
        booked_at: row.created_at,
      });
    }
  }

  return (
    <div>
      <h1 className="mb-1">Entrenadores</h1>
      <p className="text-text-dim text-sm mb-6 mt-4">
        Consulta el horario semanal de cada entrenador y sus grupos de entrenamiento.
        {isTrainer && " Pulsa cualquier clase para ver su detalle y sus miembros."}
      </p>

      {(trainers ?? []).length === 0 ? (
        <div className="border border-dashed border-line px-6 py-12 text-center text-text-dim text-sm">
          Todavía no hay entrenadores registrados.
        </div>
      ) : (
        <div className="space-y-3">
          {(trainers ?? []).map((trainer, idx) => (
            <EntrenadorHorario
              key={trainer.id}
              trainer={trainer}
              groups={(groups ?? []).filter((g) => g.trainer_id === trainer.id)}
              sessions={(sessions ?? []).filter((s) => s.trainer_id === trainer.id)}
              weekDays={weekDays}
              defaultOpen={idx === 0}
              canViewDetail={isTrainer}
              membersBySession={membersBySession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
