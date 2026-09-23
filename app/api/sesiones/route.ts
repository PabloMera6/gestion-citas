import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

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
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { name, description, maxCapacity, startsAt, endsAt, groupId } = body;

  if (!name || !maxCapacity || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json(
      { error: "La hora de fin debe ser posterior a la de inicio." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({
      trainer_id: user.id,
      name,
      description: description ?? null,
      max_capacity: maxCapacity,
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
