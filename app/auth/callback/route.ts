import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/calendario";

  // Evita redirecciones externas.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/calendario";

  // Si no tenemos code, el callback no puede completar el flujo PKCE.
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "El enlace no es válido o ha caducado. Solicita un correo nuevo."
      )}`
    );
  }

  const supabase = await createClient();

  // Intercambia el código PKCE por la sesión y guarda
  // las cookies correspondientes mediante el cliente SSR.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "El enlace no es válido o ha caducado. Solicita un correo nuevo."
      )}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}