"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const nextParam = searchParams.get("next") || "/calendario";
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/calendario";

    async function finishAuth() {
      // With the implicit flow Supabase processes access_token/refresh_token
      // from the URL fragment in the browser automatically. We wait for the
      // resulting session instead of trying to exchange a PKCE code on the
      // server. This also makes email links independent of the browser that
      // originally started registration.
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setError(error?.message || "El enlace no es válido o ha caducado.");
        return;
      }

      router.replace(next);
      router.refresh();
    }

    finishAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <AuthShell>
        <h1 className="mb-4">Enlace no válido</h1>
        <p className="text-text-dim mt-5 text-sm">
          {error}
        </p>
        <p className="text-text-dim mt-4 text-sm">
          Solicita un correo nuevo e inténtalo otra vez.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mb-4">Confirmando acceso…</h1>
      <p className="text-text-dim mt-5 text-sm">
        Estamos validando tu enlace.
      </p>
    </AuthShell>
  );
}
