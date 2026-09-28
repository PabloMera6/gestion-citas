"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/calendario");
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="flex items-center gap-2.5 mb-10 lg:hidden">
        <span className="w-9 h-9 bg-accent flex items-center justify-center text-accent-ink font-display text-xl leading-none">
          M
        </span>
        <span className="font-display text-2xl leading-none">MiGym</span>
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
          <label className="label-mono block mb-1.5">Contraseña</label>
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
          <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
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
