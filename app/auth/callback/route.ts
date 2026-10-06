import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ruta a la que apuntan los enlaces que Supabase manda por email, tanto
// para confirmar la cuenta tras el registro como para el reseteo de
// contraseña. Supabase añade un "code" en la URL que intercambiamos
// por una sesión válida.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" permite decidir a dónde ir después (p.ej. a /restablecer-contrasena
  // cuando el enlace es de recuperación, en vez de ir directo al calendario).
  const next = searchParams.get("next") ?? "/calendario";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Enlace inválido, caducado o ya usado.
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("El enlace no es válido o ha caducado. Inténtalo de nuevo.")}`
  );
}
