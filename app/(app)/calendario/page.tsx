import { getAuthContext } from "@/lib/auth-context";
import CalendarioSemana from "@/components/CalendarioSemana";
import { getWeekDays } from "@/lib/date";
import type {
  Group,
  SessionMember,
  SessionWithAvailability,
  Booking,
} from "@/lib/types/database";

interface BookingRow {
  session_id: string;
  created_at: string;
  client: { id: string; full_name: string; phone: string | null } | null;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const reference = semana ? new Date(semana) : new Date();
  const [weekStart] = getWeekDays(reference);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { supabase, user, profile } = await getAuthContext();

  if (!user) return null;

  const isTrainer = profile?.role === "trainer";

  // sessions, myBookings y groups no dependen entre sí: se lanzan en
  // paralelo en vez de esperar uno a otro en serie.
  const [{ data: sessions }, { data: myBookings }, { data: groups }] =
    await Promise.all([
      supabase
        .from("sessions_with_availability")
        .select("*")
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at"),
      supabase
        .from("bookings")
        .select("*")
        .eq("client_id", user.id)
        .eq("status", "confirmed")
        .returns<Booking[]>(),
      supabase.from("groups").select("*").eq("trainer_id", user.id).returns<Group[]>(),
    ]);

  const myBookingSessionIds: Record<string, string> = {};
  (myBookings ?? []).forEach((b) => {
    myBookingSessionIds[b.session_id] = b.id;
  });

  // Esta sí depende del resultado de "sessions", así que tiene que ir
  // después, pero solo se lanza cuando hace falta (entrenador con
  // sesiones esa semana).
  const membersBySession: Record<string, SessionMember[]> = {};
  if (isTrainer && (sessions ?? []).length > 0) {
    const { data: rows } = await supabase
      .from("bookings")
      .select("session_id, created_at, client:profiles(id, full_name, phone)")
      .in("session_id", (sessions ?? []).map((s) => s.id))
      .eq("status", "confirmed")
      .order("created_at")
      .returns<BookingRow[]>();
    for (const row of rows ?? []) {
      if (!row.client) continue;
      (membersBySession[row.session_id] ??= []).push({
        id: row.client.id,
        full_name: row.client.full_name,
        phone: row.client.phone,
        class_credits: null,
        booked_at: row.created_at,
      });
    }
  }

  return (
    <CalendarioSemana
      weekStartIso={reference.toISOString()}
      sessions={(sessions ?? []) as SessionWithAvailability[]}
      myBookingSessionIds={myBookingSessionIds}
      isTrainer={isTrainer}
      groups={groups ?? []}
      currentUserId={user.id}
      membersBySession={membersBySession}
    />
  );
}
