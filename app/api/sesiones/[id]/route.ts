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

  const isCancelled = body.isCancelled ?? true;

  if (isCancelled) {
    // cancel_session_as_trainer() marca la sesión como cancelada Y
    // cancela todas sus reservas confirmadas en la misma transacción;
    // el trigger trg_sync_booking_credit ya existente devuelve el
    // bono a cada cliente apuntado automáticamente al cancelar su
    // reserva. La función comprueba por sí misma que el usuario
    // actual es el entrenador dueño de la clase.
    const { error } = await supabase.rpc("cancel_session_as_trainer", {
      p_session_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se ha podido cancelar la clase." },
        { status: 400 }
      );
    }

    const { data } = await supabase
      .from("class_sessions")
      .select()
      .eq("id", id)
      .single();

    return NextResponse.json({ session: data });
  }

  // Reactivar la clase NO reactiva automáticamente las reservas que se
  // cancelaron: esos clientes ya recuperaron su bono y pueden haberlo
  // usado para otra cosa. Si quieren volver, se apuntan de nuevo como
  // una reserva normal.
  const { data, error } = await supabase
    .from("class_sessions")
    .update({ is_cancelled: false })
    .eq("id", id)
    .eq("trainer_id", user.id) // RLS ya lo exige, doble seguridad explícita
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido reactivar la clase." },
      { status: 400 }
    );
  }

  return NextResponse.json({ session: data });
}
