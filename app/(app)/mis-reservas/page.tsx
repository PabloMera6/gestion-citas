import { createClient } from "@/lib/supabase/server";
import ReservaButton from "@/components/ReservaButton";
import { formatFullDate, formatTime } from "@/lib/date";
import type { BookingWithSession } from "@/lib/types/database";

export default async function MisReservasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, session:sessions_with_availability(*)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .returns<BookingWithSession[]>();

  const now = new Date();
  const all = (bookings ?? []).filter((b) => b.session);

  const upcoming = all
    .filter(
      (b) => b.status === "confirmed" && new Date(b.session.starts_at) >= now
    )
    .sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));

  const past = all
    .filter(
      (b) => b.status === "cancelled" || new Date(b.session.starts_at) < now
    )
    .sort((a, b) => b.session.starts_at.localeCompare(a.session.starts_at));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Mis reservas</h1>
      <p className="text-text-dim text-sm mb-6">
        Aquí puedes ver tus próximas clases y tu historial.
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide mb-3">
          Próximas ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState text="No tienes clases reservadas todavía. Ve al calendario para apuntarte a una." />
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((b) => (
              <ReservaCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide mb-3">
            Historial
          </h2>
          <div className="space-y-2.5">
            {past.map((b) => (
              <ReservaCard key={b.id} booking={b} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReservaCard({
  booking,
  muted = false,
}: {
  booking: BookingWithSession;
  muted?: boolean;
}) {
  const session = booking.session;
  const start = new Date(session.starts_at);
  const isPast = start < new Date();
  const color = session.trainer_color ?? "#6366f1";

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border border-line bg-bg-raised px-4 py-3.5 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="font-medium truncate">{session.name}</p>
          <p className="text-sm text-text-dim capitalize truncate">
            {formatFullDate(start)} · {formatTime(start)}
          </p>
          <p className="text-xs text-text-faint truncate">
            Con {session.trainer_name}
            {session.group_name ? ` · ${session.group_name}` : ""}
          </p>
          {booking.status === "cancelled" && (
            <p className="text-xs text-danger mt-0.5">Cancelaste esta reserva</p>
          )}
        </div>
      </div>
      {booking.status === "confirmed" && (
        <ReservaButton
          sessionId={session.id}
          bookingId={booking.id}
          reserved
          availableSpots={session.available_spots}
          cancelled={session.is_cancelled}
          isPast={isPast}
          startsAt={session.starts_at}
        />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-text-dim text-sm">
      {text}
    </div>
  );
}
