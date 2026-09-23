import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import type { Profile } from "@/lib/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    // El usuario existe en auth.users pero no tiene fila en public.profiles.
    // Esto pasa si el usuario se creó ANTES de ejecutar schema.sql (el
    // trigger handle_new_user solo se dispara en el momento del signUp),
    // o si el trigger falló por algún motivo. En vez de redirigir en
    // silencio a /login (lo que parece un fallo de sesión pero no lo es),
    // mostramos el problema real para poder diagnosticarlo.
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold mb-2">
            Tu cuenta no tiene perfil todavía
          </p>
          <p className="text-text-dim text-sm mb-1">
            Estás autenticado como <span className="text-text">{user.email}</span>,
            pero no existe una fila para tu usuario en la tabla{" "}
            <code className="text-accent">profiles</code>.
          </p>
          <p className="text-text-dim text-sm mt-3">
            Suele pasar cuando la cuenta se creó antes de ejecutar el
            esquema actual, o si el registro se hizo directamente desde
            Supabase Authentication en vez de desde <code>/registro</code>.
            Pide a quien administra la base de datos que revise la tabla{" "}
            <code className="text-accent">profiles</code> para tu usuario
            (id: <code className="text-accent">{user.id}</code>).
          </p>
          {profileError && (
            <div className="text-xs text-text-faint mt-4 text-left bg-bg-raised rounded-lg p-3 space-y-1">
              <p><strong>code:</strong> {profileError.code || "—"}</p>
              <p><strong>message:</strong> {profileError.message || "—"}</p>
              <p><strong>details:</strong> {profileError.details || "—"}</p>
              <p><strong>hint:</strong> {profileError.hint || "—"}</p>
            </div>
          )}
          {!profileError && (
            <p className="text-xs text-text-faint mt-4">
              La consulta no devolvió error, simplemente no encontró ninguna fila.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:flex">
      <NavBar profile={profile} />
      <main className="flex-1 min-w-0 px-4 py-6 pb-24 sm:pb-6 sm:px-8 sm:py-8 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
