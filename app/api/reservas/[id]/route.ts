import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CANCELLATION_LIMIT_HOURS } from "@/lib/types/database";

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

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("client_id", user.id)
    .select()
    .single();

  if (error) {
    // El trigger trg_check_cancellation lanza una excepción legible si
    // quedan menos de CANCELLATION_LIMIT_HOURS horas para la clase.
    return NextResponse.json(
      {
        error:
          error.message ||
          `No se puede cancelar con menos de ${CANCELLATION_LIMIT_HOURS} horas de antelación.`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ booking: data });
}

// PATCH { newSessionId } → mueve la reserva a otra sesión.
// Toda la lógica de negocio (ventana de 12h para poder modificar, y la
// regla especial de conservar el bono si se mueve dentro de la misma
// semana con al menos 5h de antelación) vive en la función SQL
// reschedule_booking, que corre en una única transacción: si la nueva
// sesión no tiene hueco, la reserva original no se toca.
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

  let newSessionId: string | undefined;
  try {
    const body = await request.json();
    newSessionId = body.newSessionId;
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (!newSessionId) {
    return NextResponse.json(
      { error: "Falta el identificador de la nueva clase." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: id,
    p_new_session_id: newSessionId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se ha podido mover la reserva." },
      { status: 400 }
    );
  }

  return NextResponse.json({ bookingId: data });
}
