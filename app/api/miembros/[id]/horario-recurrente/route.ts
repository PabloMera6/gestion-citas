import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RecurringOccurrence, RecurringScheduleResult, TrainingModality } from "@/lib/types/database";

interface RequestBody {
  trainingModality?: TrainingModality;
  maxCapacity?: number;
  weeks?: number;
  startsOn?: string; // "YYYY-MM-DD", lunes de la primera semana
  occurrences?: RecurringOccurrence[];
  name?: string;
}

// POST → crea un horario recurrente para el cliente `id` y genera de
// golpe todas las sesiones/reservas correspondientes. La resolución de
// fecha+hora (timezone local del entrenador → UTC) ya viene hecha
// desde el cliente (ver lib/date.ts buildRecurringOccurrences); este
// endpoint solo valida la forma del payload y delega toda la lógica de
// negocio (aforo, solapamiento, bonos, qué ocurrencias se pudieron
// crear y cuáles no) a la función SQL create_recurring_schedule, que
// ya hace las comprobaciones de permisos (solo entrenadores) por su
// cuenta.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { trainingModality, maxCapacity, weeks, startsOn, occurrences, name } = body;

  if (!trainingModality || !maxCapacity || !weeks || !startsOn || !occurrences?.length) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  if (weeks < 1 || weeks > 26) {
    return NextResponse.json(
      { error: "El número de semanas debe estar entre 1 y 26." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("create_recurring_schedule", {
    p_client_id: clientId,
    p_training_modality: trainingModality,
    p_max_capacity: maxCapacity,
    p_weeks: weeks,
    p_starts_on: startsOn,
    p_occurrences: occurrences,
    p_name: name || "Entrenamiento",
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido crear el horario recurrente." },
      { status: 400 }
    );
  }

  const results = (data ?? []) as RecurringScheduleResult[];
  const createdCount = results.filter((r) => r.created).length;
  const failedCount = results.length - createdCount;

  return NextResponse.json({ results, createdCount, failedCount });
}
