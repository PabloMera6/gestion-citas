"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import PasswordStrengthHint from "@/components/PasswordStrengthHint";
import { isPasswordValid, passwordErrorMessage } from "@/lib/password";

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordError = passwordErrorMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/calendario"), 1500);
  }

  if (success) {
    return (
      <AuthShell>
        <span className="inline-flex w-14 h-14 bg-accent items-center justify-center text-accent-ink font-display text-3xl mb-5">
          ✓
        </span>
        <h1 className="mb-4">Contraseña actualizada</h1>
        <p className="text-text-dim mt-5 text-sm">Te llevamos a tu calendario…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-10 lg:hidden">
        <img src="/Bibelo.jpg" alt="Bíbelo" className="h-10 w-auto max-w-40 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>

      <p className="label-mono mb-3">Recuperar acceso</p>
      <h1 className="mb-3">Crea una nueva contraseña</h1>
      <p className="text-text-dim mb-8 mt-5">Elige una contraseña que no hayas usado antes.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-mono block mb-1.5">Nueva contraseña</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            placeholder="Mínimo 8 caracteres, letra y número"
          />
          <PasswordStrengthHint password={password} />
        </div>

        <div>
          <label className="label-mono block mb-1.5">Repite la contraseña</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-line bg-bg-raised px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            placeholder="Repite la contraseña"
          />
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !isPasswordValid(password)}
          className="w-full bg-accent text-accent-ink py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </AuthShell>
  );
}
