"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

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
      <AuthShell>
        <span className="inline-flex w-14 h-14 bg-accent items-center justify-center text-accent-ink font-display text-3xl mb-5">
          ✓
        </span>
        <h1 className="mb-4">¡Cuenta creada!</h1>
        <p className="text-text-dim mt-5 text-sm">
          Revisa tu email si se requiere confirmación. Te llevamos a login…
        </p>
      </AuthShell>
    );
  }

  const inputCls =
    "w-full border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:border-text";

  return (
    <AuthShell>
      <div className="flex items-center gap-2.5 mb-10 lg:hidden">
        <span className="w-9 h-9 bg-accent flex items-center justify-center text-accent-ink font-display text-xl leading-none">
          M
        </span>
        <span className="font-display text-2xl leading-none">MiGym</span>
      </div>

      <p className="label-mono mb-3">02 — Alta</p>
      <h1 className="mb-3">Crear cuenta</h1>
      <p className="text-text-dim mb-8 mt-5">Únete al gimnasio</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-mono block mb-1.5">Nombre completo</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Ana Pérez"
          />
        </div>

        <div>
          <label className="label-mono block mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="label-mono block mb-1.5">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label className="label-mono block mb-1.5">Soy…</label>
          <div className="grid grid-cols-2 gap-2">
            {(["client", "trainer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`border py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                  role === r
                    ? "border-text bg-text text-bg"
                    : "border-line text-text-dim hover:text-text hover:border-text-faint"
                }`}
              >
                {r === "client" ? "Cliente" : "Entrenador"}
              </button>
            ))}
          </div>
        </div>


        {error && (
          <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-accent-ink py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-text-dim mt-6 text-center">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-text underline underline-offset-4 decoration-2 hover:bg-accent hover:text-accent-ink px-0.5 transition-colors">
          Entra
        </Link>
      </p>
    </AuthShell>
  );
}
