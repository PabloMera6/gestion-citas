import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Entrada única para los enlaces de autenticación enviados por Supabase.
 *
 * Soporta:
 *   - token_hash + type: plantillas que usan {{ .TokenHash }}
 *   - code: flujo PKCE / plantillas que terminan en un código
 *
 * Supabase también puede devolver `error`, `error_code` y
 * `error_description` en la URL cuando su endpoint de verificación
 * rechaza el enlace. En ese caso mostramos un mensaje coherente.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/calendario";

  // Evita que `next` pueda convertirse en una redirección externa.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/calendario";

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

  // Si Supabase ya ha rechazado el enlace, no intentamos reutilizarlo.
  // Los tokens de confirmación son de un solo uso y tienen caducidad.
  const providerError =
    searchParams.get("error_description") ||
    searchParams.get("error");

  const message = providerError
    ? "El enlace de acceso ya no es válido o ha caducado. Solicita un correo nuevo."
    : "El enlace no es válido o ha caducado. Solicita un correo nuevo.";

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(message)}`
  );
}
