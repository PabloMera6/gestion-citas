import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/calendario";

  // Evita redirecciones externas.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/calendario";

  const invalidLinkRedirect = () =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "El enlace no es válido o ha caducado. Solicita un correo nuevo."
      )}`
    );

  const supabase = await createClient();

  // Caso principal: enlaces de confirmación de email (alta de cuenta,
  // cambio de email, recuperación de contraseña...) llegan con
  // token_hash + type. A diferencia del flujo PKCE (más abajo), verifyOtp
  // no depende de ningún estado guardado en el navegador que generó la
  // petición, por lo que el enlace funciona también si se abre desde un
  // navegador o dispositivo distinto al usado para crear la cuenta.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return invalidLinkRedirect();
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Compatibilidad con el flujo PKCE (?code=...), usado por ejemplo en
  // el login con proveedores OAuth, donde sí se abre en el mismo
  // navegador que inició la petición.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return invalidLinkRedirect();
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return invalidLinkRedirect();
}