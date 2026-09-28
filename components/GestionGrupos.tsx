"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Group } from "@/lib/types/database";

export default function GestionGrupos({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El grupo necesita un nombre.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se ha podido crear el grupo.");
        return;
      }
      setName("");
      setDescription("");
      setCreating(false);
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este grupo? Las clases asociadas se quedarán sin grupo.")) return;
    await fetch(`/api/grupos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl">Mis grupos de entrenamiento</h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            + Nuevo grupo
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-line bg-bg px-4 py-4 mb-3 space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del grupo (p.ej. Fuerza avanzado)"
            className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-accent-ink px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Creando…" : "Crear grupo"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="px-3 py-2 text-sm text-text-dim hover:text-text"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 && !creating ? (
        <p className="text-sm text-text-faint py-3">
          Todavía no tienes grupos. Créalos para organizar a tus clientes y asignarlos a clases.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5"
            >
              <span className="w-2 h-2 bg-text shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{g.name}</p>
                {g.description && (
                  <p className="text-xs text-text-dim truncate">{g.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(g.id)}
                aria-label={`Eliminar ${g.name}`}
                className="text-text-faint hover:text-danger p-1"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-4 h-4">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
