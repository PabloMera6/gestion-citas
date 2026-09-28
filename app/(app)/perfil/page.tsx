import { createClient } from "@/lib/supabase/server";
import EditarPerfilForm from "@/components/EditarPerfilForm";
import GestionGrupos from "@/components/GestionGrupos";
import type { Group, MemberDetails, Profile } from "@/lib/types/database";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  let details: MemberDetails | null = null;
  if (profile.role === "client") {
    const { data } = await supabase
      .from("member_details")
      .select("*")
      .eq("member_id", user.id)
      .maybeSingle<MemberDetails>();
    details = data;
  }

  let groups: Group[] = [];
  if (profile.role === "trainer") {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("trainer_id", user.id)
      .order("created_at")
      .returns<Group[]>();
    groups = data ?? [];
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1">Mi perfil</h1>
      <p className="text-text-dim text-sm mb-6 mt-4">
        {profile.role === "trainer"
          ? "Gestiona tus datos y tus grupos de entrenamiento."
          : "Gestiona tus datos de contacto."}
      </p>

      {profile.role === "client" && (
        <div className="border border-text bg-bg-raised px-5 py-5 mb-6 flex items-end justify-between gap-4 shadow-[5px_5px_0_0_rgba(255,255,255,0.85)]">
          <div>
            <p className="label-mono mb-1">Bonos de clases disponibles</p>
            <p className="text-sm text-text-dim">
              Los gestionan los entrenadores del gimnasio.
            </p>
          </div>
          <p className="font-display text-6xl leading-none">
            {details?.class_credits ?? 0}
          </p>
        </div>
      )}

      <div className="border border-line bg-bg-raised px-5 py-5 mb-6">
        <EditarPerfilForm profile={profile} />
      </div>

      {profile.role === "trainer" && (
        <div className="border border-line bg-bg-raised px-5 py-5">
          <GestionGrupos groups={groups} />
        </div>
      )}
    </div>
  );
}
