"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmedEmail(null);
    setResent(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message === "Email not confirmed") {
        setError("Todavía no has confirmado tu email.");
        setUnconfirmedEmail(email);
      } else {
        setError("Email o contraseña incorrectos.");
      }
      return;
    }

    router.push("/calendario");
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!unconfirmedEmail) return;
    setResending(true);
    await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    setResent(true);
  }

  return (
    <AuthShell>
      <div className="mb-10 lg:hidden">
        <img src="/Bibelo.jpg" alt="Bíbelo" className="h-10 w-auto max-w-40 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>

      <p className="label-mono mb-3">01 — Acceso</p>
      <h1 className="mb-3">Bienvenido de nuevo</h1>
      <p className="text-text-dim mb-8 mt-5">Accede a tu cuenta del gimnasio</p>

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-mono">Contraseña</label>
            <Link href="/recuperar-contrasena" className="text-xs text-text-dim hover:text-text underline underline-offset-4">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger-bg px-3 py-2 space-y-2">
            <p>{error}</p>
            {unconfirmedEmail && !resent && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="underline underline-offset-4 disabled:opacity-50"
              >
                {resending ? "Enviando…" : "Reenviar email de confirmación"}
              </button>
            )}
            {resent && <p>Te hemos reenviado el email de confirmación.</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-accent-ink py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-text-dim mt-6 text-center">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-text underline underline-offset-4 decoration-2 hover:bg-accent hover:text-accent-ink px-0.5 transition-colors">
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
