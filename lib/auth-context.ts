import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

/**
 * Resuelve el usuario autenticado y su perfil UNA SOLA VEZ por petición
 * al servidor, sin importar cuántas veces se llame a esta función desde
 * distintos puntos del árbol (layout, página, componentes server).
 *
 * `React.cache()` memoiza por la duración de un único render de servidor:
 * la primera llamada hace las consultas reales a Supabase, y cualquier
 * llamada posterior (incluso en un componente completamente distinto)
 * reutiliza el resultado ya resuelto en vez de repetir las consultas.
 *
 * Antes de esto, app/(app)/layout.tsx Y cada page.tsx dentro de él
 * llamaban cada uno a getUser() + "select * from profiles" por su
 * cuenta, multiplicando por 2-3 las mismas dos consultas en cada
 * navegación. Con este helper solo se ejecutan una vez.
 */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null, profileError: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile, profileError };
});
