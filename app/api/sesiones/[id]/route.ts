import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: { isCancelled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .update({ is_cancelled: body.isCancelled ?? true })
    .eq("id", id)
    .eq("trainer_id", user.id) // RLS ya lo exige, doble seguridad explícita
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido actualizar la clase." },
      { status: 400 }
    );
  }

  return NextResponse.json({ session: data });
}
