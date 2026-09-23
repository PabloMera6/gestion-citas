import { createClient } from "@/lib/supabase/server";
import EditarPerfilForm from "@/components/EditarPerfilForm";
import GestionGrupos from "@/components/GestionGrupos";
import type { Group, Profile } from "@/lib/types/database";

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
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Mi perfil</h1>
      <p className="text-text-dim text-sm mb-6">
        {profile.role === "trainer"
          ? "Gestiona tus datos y tus grupos de entrenamiento."
          : "Gestiona tus datos de contacto."}
      </p>

      <div className="rounded-xl border border-line bg-bg-raised px-5 py-5 mb-6">
        <EditarPerfilForm profile={profile} />
      </div>

      {profile.role === "trainer" && (
        <div className="rounded-xl border border-line bg-bg-raised px-5 py-5">
          <GestionGrupos groups={groups} />
        </div>
      )}
    </div>
  );
}
