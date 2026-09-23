"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Group } from "@/lib/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  prefillDate: Date | null;
  trainerId: string;
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CrearClaseModal({
  open,
  onClose,
  groups,
  prefillDate,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [duration, setDuration] = useState(60);
  const [startsAt, setStartsAt] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const base = prefillDate ?? new Date();
      setStartsAt(toLocalInputValue(base));
      setName("");
      setDescription("");
      setMaxCapacity(10);
      setDuration(60);
      setGroupId("");
      setError(null);
    }
  }, [open, prefillDate]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !startsAt) {
      setError("Rellena al menos el nombre y la hora de inicio.");
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(start.getTime() + duration * 60000);

    setLoading(true);
    try {
      const response = await fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          maxCapacity,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          groupId: groupId || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se ha podido crear la clase.");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-bg-raised border border-line rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Nueva clase</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-dim hover:text-text p-1"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Nombre de la clase
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HIIT, Fuerza, Movilidad…"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1.5">
                Inicio
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1.5">
                Duración (min)
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1.5">
                Aforo máximo
              </label>
              <input
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1.5">
                Grupo (opcional)
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Sin grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
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
            {loading ? "Creando…" : "Crear clase"}
          </button>
        </form>
      </div>
    </div>
  );
}
