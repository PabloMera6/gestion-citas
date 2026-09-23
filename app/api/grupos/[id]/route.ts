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

  let body: { name?: string; description?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.description !== undefined) update.description = body.description.trim() || null;
  if (body.color !== undefined) update.color = body.color;

  const { data, error } = await supabase
    .from("groups")
    .update(update)
    .eq("id", id)
    .eq("trainer_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido actualizar el grupo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ group: data });
}

export async function DELETE(
  _request: Request,
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

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id)
    .eq("trainer_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido eliminar el grupo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
