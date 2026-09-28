import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MiembrosTabla from "@/components/MiembrosTabla";
import type { Member, Profile } from "@/lib/types/database";

interface MemberRow {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  member_details:
    | { class_credits: number }
    | { class_credits: number }[]
    | null;
}

export default async function MiembrosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Pick<Profile, "role">>();

  // Sección solo para entrenadores
  if (me?.role !== "trainer") redirect("/calendario");

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, member_details(class_credits)")
    .eq("role", "client")
    .order("full_name")
    .returns<MemberRow[]>();

  const members: Member[] = (rows ?? []).map((r) => {
    const d = Array.isArray(r.member_details) ? r.member_details[0] : r.member_details;
    return {
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      created_at: r.created_at,
      class_credits: d?.class_credits ?? 0,
    };
  });

  return (
    <div>
      <h1 className="mb-1">Miembros</h1>
      <p className="text-text-dim text-sm mb-6 mt-4">
        Todos los miembros del gimnasio y sus bonos de clases disponibles.
        Puedes sumar o restar bonos cuando haga falta.
      </p>

      {error ? (
        <div className="text-sm text-danger bg-danger-bg px-4 py-3">
          No se han podido cargar los miembros: {error.message}. Si acabas de
          actualizar la app, ejecuta <code>supabase/migracion_bonos.sql</code>{" "}
          en tu proyecto de Supabase.
        </div>
      ) : (
        <MiembrosTabla initialMembers={members} />
      )}
    </div>
  );
}
