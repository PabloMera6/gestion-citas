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
      { error: "Solo los entrenadores pueden crear grupos." },
      { status: 403 }
    );
  }

  let name: string | undefined;
  let description: string | undefined;
  let color: string | undefined;

  try {
    const body = await request.json();
    name = body.name?.trim();
    description = body.description?.trim();
    color = body.color;
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "El grupo necesita un nombre." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("groups")
    .insert({
      trainer_id: user.id,
      name,
      description: description || null,
      color: color || profile.color,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido crear el grupo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ group: data }, { status: 201 });
}
