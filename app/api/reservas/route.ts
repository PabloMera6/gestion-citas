import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para reservar." },
      { status: 401 }
    );
  }

  let sessionId: string | undefined;
  try {
    const body = await request.json();
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Falta el identificador de la clase." },
      { status: 400 }
    );
  }

  // Comprobamos primero que la sesión existe, no está cancelada y no ha
  // empezado, para dar un mensaje claro. El control de aforo real y la
  // unicidad (un cliente no puede reservar dos veces la misma sesión)
  // los aplica la base de datos: el trigger trg_check_capacity y la
  // restricción unique(session_id, client_id).
  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, is_cancelled, starts_at")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Esta clase ya no existe." }, { status: 404 });
  }
  if (session.is_cancelled) {
    return NextResponse.json({ error: "Esta clase ha sido cancelada." }, { status: 400 });
  }
  if (new Date(session.starts_at) <= new Date()) {
    return NextResponse.json({ error: "Esta clase ya ha empezado." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({ session_id: sessionId, client_id: user.id })
    .select()
    .single();

  if (error) {
    // El trigger de aforo lanza una excepción con mensaje legible;
    // la unique constraint devuelve el código 23505.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya tienes una reserva para esta clase." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "No se ha podido realizar la reserva." },
      { status: 400 }
    );
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
