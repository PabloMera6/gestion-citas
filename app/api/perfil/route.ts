import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: {
    fullName?: string;
    phone?: string;
    color?: string;
    bio?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (body.fullName !== undefined) update.full_name = body.fullName.trim();
  if (body.phone !== undefined) update.phone = body.phone.trim() || null;
  if (body.color !== undefined) update.color = body.color;
  if (body.bio !== undefined) update.bio = body.bio.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido actualizar el perfil." },
      { status: 400 }
    );
  }

  return NextResponse.json({ profile: data });
}
