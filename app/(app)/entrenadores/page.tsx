import { createClient } from "@/lib/supabase/server";
import EntrenadorHorario from "@/components/EntrenadorHorario";
import { getWeekDays } from "@/lib/date";
import type { Group, Profile, SessionWithAvailability } from "@/lib/types/database";

export default async function EntrenadoresPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Entrenadores
      </h1>
      <p className="text-text-dim text-sm mb-6">
        Consulta el horario semanal de cada entrenador y sus grupos de entrenamiento.
      </p>

      {(trainers ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-text-dim text-sm">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
