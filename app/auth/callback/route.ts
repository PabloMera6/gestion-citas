import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Ruta a la que apuntan los enlaces que Supabase manda por email, tanto
// para confirmar la cuenta tras el registro como para el reseteo de
// contraseña.
//
// Supabase puede mandar el enlace en dos formatos distintos según cómo
// esté configurada la plantilla de email del proyecto:
//   - Plantilla por defecto: ?token_hash=...&type=signup (o "recovery",
//     "email_change", etc.) → se valida con supabase.auth.verifyOtp().
//     Este es el formato que realmente usa Supabase "out of the box",
//     y el que faltaba aquí: antes solo se comprobaba "code", así que
//     con la plantilla por defecto SIEMPRE caía al mensaje de enlace
//     inválido, aunque el enlace fuera perfectamente válido.
//   - Flujo PKCE / OAuth: ?code=... → se intercambia con
//     supabase.auth.exchangeCodeForSession().
// Soportamos ambos para no depender de qué plantilla tenga configurada
// el proyecto de Supabase.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  // "next" permite decidir a dónde ir después (p.ej. a /restablecer-contrasena
  // cuando el enlace es de recuperación, en vez de ir directo al calendario).
  const next = searchParams.get("next") ?? "/calendario";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
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
