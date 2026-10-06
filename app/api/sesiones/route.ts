import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TrainingModality } from "@/lib/types/database";
import { MAX_GROUP_CAPACITY, MAX_CONCURRENT_SESSIONS } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.role !== "trainer") {
    return NextResponse.json(
      { error: "Solo los entrenadores pueden crear clases." },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    description?: string;
    maxCapacity?: number;
    startsAt?: string;
    endsAt?: string;
    groupId?: string | null;
    trainingModality?: TrainingModality;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { name, description, maxCapacity, startsAt, endsAt, groupId, trainingModality = "individual" } = body;

  if (!name || !maxCapacity || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  // Las modalidades fijas (individual, dúo, group3, group4) exigen un
  // aforo exacto. "custom_group" es la única con rango: de 5 personas
  // hasta MAX_GROUP_CAPACITY, el máximo físico que el gimnasio puede
  // atender en un entrenamiento de grupo.
  const capacityRules: Record<TrainingModality, { min: number; max: number; exact?: boolean }> = {
    individual: { min: 1, max: 1, exact: true },
    duo: { min: 2, max: 2, exact: true },
    group3: { min: 3, max: 3, exact: true },
    group4: { min: 4, max: 4, exact: true },
    custom_group: { min: 5, max: MAX_GROUP_CAPACITY },
  };
  const rule = capacityRules[trainingModality];
  const capacityOk = rule && (rule.exact ? maxCapacity === rule.max : maxCapacity >= rule.min && maxCapacity <= rule.max);
  if (!capacityOk) {
    return NextResponse.json(
      {
        error: rule?.exact
          ? "El aforo no coincide con la modalidad seleccionada."
          : `El grupo debe tener entre ${rule.min} y ${rule.max} personas.`,
      },
      { status: 400 }
    );
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json(
      { error: "La hora de fin debe ser posterior a la de inicio." },
      { status: 400 }
    );
  }

  // El gimnasio solo tiene espacio/material para MAX_CONCURRENT_SESSIONS
  // entrenamientos a la vez, sea cual sea su modalidad. Comprobamos
  // cuántas sesiones activas ya solapan con el horario propuesto.
  // Dos rangos [a, b) y [c, d) se solapan si a < d y b > c.
  const { count: overlapCount, error: overlapError } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("is_cancelled", false)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);

  if (overlapError) {
    return NextResponse.json(
      { error: "No se ha podido comprobar la disponibilidad del horario." },
      { status: 500 }
    );
  }

  if ((overlapCount ?? 0) >= MAX_CONCURRENT_SESSIONS) {
    return NextResponse.json(
      {
        error: `Ya hay ${MAX_CONCURRENT_SESSIONS} entrenamientos en ese horario. El gimnasio no puede atender más a la vez.`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({
      trainer_id: user.id,
      name,
      description: description ?? null,
      max_capacity: maxCapacity,
      training_modality: trainingModality,
      starts_at: startsAt,
      ends_at: endsAt,
      group_id: groupId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido crear la clase." },
      { status: 400 }
    );
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
