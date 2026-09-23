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
