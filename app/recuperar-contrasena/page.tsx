"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function RecuperarContrasenaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer-contrasena`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Mostramos siempre el mismo mensaje exista o no esa cuenta, para
    // no filtrar qué emails están registrados en el gimnasio.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell>
        <span className="inline-flex w-14 h-14 bg-accent items-center justify-center text-accent-ink font-display text-3xl mb-5">
          ✉️
        </span>
        <h1 className="mb-4">Revisa tu correo</h1>
        <p className="text-text-dim mt-5 text-sm">
          Si existe una cuenta con el email <strong className="text-text">{email}</strong>, te hemos
          enviado un enlace para restablecer tu contraseña.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-10 lg:hidden">
        <img src="/Bibelo.jpg" alt="Bíbelo" className="h-10 w-auto max-w-40 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>

      <p className="label-mono mb-3">Recuperar acceso</p>
      <h1 className="mb-3">¿Olvidaste tu contraseña?</h1>
      <p className="text-text-dim mb-8 mt-5">
        Escribe tu email y te mandamos un enlace para crear una contraseña nueva.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-mono block mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            placeholder="tu@email.com"
          />
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-accent-ink py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <p className="text-sm text-text-dim mt-6 text-center">
        <Link href="/login" className="text-text underline underline-offset-4 decoration-2 hover:bg-accent hover:text-accent-ink px-0.5 transition-colors">
          Volver a entrar
        </Link>
      </p>
    </AuthShell>
  );
}
