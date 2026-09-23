"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";
import { TRAINER_COLORS } from "@/lib/types/database";

export default function EditarPerfilForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [color, setColor] = useState(profile.color);
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
          ...(profile.role === "trainer" ? { color } : {}),
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
        <label className="block text-sm font-medium text-text-dim mb-1.5">
          Nombre completo
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-dim mb-1.5">
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
            <label className="block text-sm font-medium text-text-dim mb-1.5">
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

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Color identificativo
            </label>
            <div className="flex items-center gap-2">
              {TRAINER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  style={{ backgroundColor: c }}
                  className={`relative w-7 h-7 rounded-full flex items-center justify-center transition ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-bg-raised ring-bg"
                      : "hover:scale-105"
                  }`}
                >
                  {color === c && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="3"
                      stroke="#15171C"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-faint mt-1.5">
              Se usa para identificarte en el calendario y el horario de entrenadores.
            </p>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && !error && (
        <p className="text-sm text-accent">Perfil actualizado.</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-accent text-accent-ink px-4 py-2.5 text-sm font-semibold shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent transition-colors disabled:opacity-50 disabled:hover:bg-accent"
      >
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
