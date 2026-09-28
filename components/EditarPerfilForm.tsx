"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export default function EditarPerfilForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!fullName.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          bio,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se ha podido guardar.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-mono block mb-1.5">
          Nombre completo
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="label-mono block mb-1.5">
          Teléfono
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="600 000 000"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {profile.role === "trainer" && (
        <>
          <div>
            <label className="label-mono block mb-1.5">
              Bio / especialidad
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Entrenador especializado en fuerza y acondicionamiento…"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

        </>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && !error && (
        <p className="label-mono !text-text">✓ Perfil actualizado</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-accent-ink px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
