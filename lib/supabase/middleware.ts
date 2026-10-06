import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas protegidas: si no hay usuario, redirige a login.
  // /auth/callback, /recuperar-contrasena y /restablecer-contrasena
  // deben ser siempre públicas: son el propio mecanismo por el que un
  // usuario sin sesión (o con una sesión temporal de recuperación)
  // confirma su email o establece una contraseña nueva.
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/registro") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/recuperar-contrasena") ||
    request.nextUrl.pathname.startsWith("/restablecer-contrasena");

  // De las rutas públicas, solo login/registro deben expulsar a un
  // usuario que ya tiene sesión hacia el calendario. /restablecer-contrasena
  // necesita que el usuario SÍ tenga sesión (la crea el propio enlace
  // de recuperación) para poder completar el cambio de contraseña, así
  // que no debe redirigirlo fuera.
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/registro");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    // IMPORTANTE: copiamos las cookies refrescadas por Supabase a la
    // respuesta de redirección. Si no lo hacemos, el navegador sigue
    // mandando cookies viejas en la siguiente petición y getUser()
    // alterna entre user/null en cada request, provocando un bucle
    // infinito de redirecciones /login <-> /calendario.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/calendario";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
