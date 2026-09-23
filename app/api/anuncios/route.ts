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
      { error: "Solo los entrenadores pueden publicar en el tablón." },
      { status: 403 }
    );
  }

  let title: string | undefined;
  let content: string | undefined;
  let pinned = false;

  try {
    const body = await request.json();
    title = body.title?.trim();
    content = body.content?.trim();
    pinned = Boolean(body.pinned);
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (!title || !content) {
    return NextResponse.json(
      { error: "El título y el contenido son obligatorios." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({ author_id: user.id, title, content, pinned })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido publicar el anuncio." },
      { status: 400 }
    );
  }

  return NextResponse.json({ announcement: data }, { status: 201 });
}
