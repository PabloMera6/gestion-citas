"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-accent-ink font-bold">
            M
          </span>
          <span className="font-semibold text-xl tracking-tight">MiGym</span>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Bienvenido de nuevo</h1>
        <p className="text-text-dim mb-8">Accede a tu cuenta del gimnasio</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-ink rounded-lg py-2.5 font-semibold shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent transition-colors disabled:opacity-50 disabled:hover:bg-accent"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-text-dim mt-6 text-center">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
