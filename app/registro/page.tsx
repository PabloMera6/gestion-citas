"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "trainer">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <span className="inline-flex w-12 h-12 rounded-full bg-accent items-center justify-center text-accent-ink font-bold text-xl mb-4">
            ✓
          </span>
          <p className="text-lg font-semibold">¡Cuenta creada!</p>
          <p className="text-text-dim mt-1 text-sm">
            Revisa tu email si se requiere confirmación. Te llevamos a login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-accent-ink font-bold">
            M
          </span>
          <span className="font-semibold text-xl tracking-tight">MiGym</span>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Crear cuenta</h1>
        <p className="text-text-dim mb-8">Únete al gimnasio</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Ana Pérez"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Soy…
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  role === "client"
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line text-text-dim hover:text-text hover:border-text-faint"
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setRole("trainer")}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  role === "trainer"
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line text-text-dim hover:text-text hover:border-text-faint"
                }`}
              >
                Entrenador
              </button>
            </div>
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
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-sm text-text-dim mt-6 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Entra
          </Link>
        </p>
      </div>
    </div>
  );
}
