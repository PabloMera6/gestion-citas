import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreditMovement } from "@/lib/types/database";

// POST { delta: number, reason?: string } → suma o resta bonos a un miembro.
// La lógica real (permisos, bloqueo de fila, saldo >= 0 y registro del
// movimiento) vive en la función SQL adjust_class_credits.
export async function POST(
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

  let body: { delta?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json(
      { error: "Indica un número entero distinto de 0." },
      { status: 400 }
    );
  }
  if (Math.abs(delta) > 100) {
    return NextResponse.json(
      { error: "No se pueden modificar más de 100 bonos de una vez." },
      { status: 400 }
    );
  }
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";

  const { data, error } = await supabase.rpc("adjust_class_credits", {
    p_member: id,
    p_delta: delta,
    p_reason: reason || null,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "No se han podido actualizar los bonos." },
      { status: 400 }
    );
  }

  return NextResponse.json({ credits: data as number });
}

// GET → últimos movimientos de bonos de un miembro (solo entrenadores,
// lo garantiza la RLS de class_credit_movements).
export async function GET(
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
    .from("class_credit_movements")
    .select("*, trainer:profiles!class_credit_movements_trainer_id_fkey(full_name)")
    .eq("member_id", id)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const movements: CreditMovement[] = (data ?? []).map(
    (m: CreditMovement & { trainer: { full_name: string } | null }) => ({
      id: m.id,
      member_id: m.member_id,
      trainer_id: m.trainer_id,
      delta: m.delta,
      balance_after: m.balance_after,
      reason: m.reason,
      created_at: m.created_at,
      trainer_name: m.trainer?.full_name ?? null,
    })
  );

  return NextResponse.json({ movements });
}
