import { createClient } from "@/lib/supabase/server";
import CalendarioSemana from "@/components/CalendarioSemana";
import { getWeekDays } from "@/lib/date";
import type {
  Profile,
  Group,
  SessionWithAvailability,
  Booking,
} from "@/lib/types/database";

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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const isTrainer = profile?.role === "trainer";

  const { data: sessions } = await supabase
    .from("sessions_with_availability")
    .select("*")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at");

  const { data: myBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("client_id", user.id)
    .eq("status", "confirmed")
    .returns<Booking[]>();

  const myBookingSessionIds: Record<string, string> = {};
  (myBookings ?? []).forEach((b) => {
    myBookingSessionIds[b.session_id] = b.id;
  });

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .eq("trainer_id", user.id)
    .returns<Group[]>();

  return (
    <CalendarioSemana
      weekStartIso={reference.toISOString()}
      sessions={(sessions ?? []) as SessionWithAvailability[]}
      myBookingSessionIds={myBookingSessionIds}
      isTrainer={isTrainer}
      groups={groups ?? []}
      currentUserId={user.id}
    />
  );
}
