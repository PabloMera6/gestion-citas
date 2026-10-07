"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";
import { buildRecurringOccurrences } from "@/lib/date";
import { TRAINING_MODALITIES, MAX_GROUP_CAPACITY, WEEKDAY_LABELS } from "@/lib/types/database";
import type {
  Member,
  RecurringScheduleResult,
  RecurringSlotInput,
  TrainingModality,
} from "@/lib/types/database";

type Props = {
  member: Member;
  onClose: () => void;
};

// Días en el orden habitual de un calendario español (lunes primero),
// pero cada botón guarda el índice "real" de JS (0=domingo..6=sábado)
// que espera el resto del sistema.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatResultDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HorarioRecurrenteModal({ member, onClose }: Props) {
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(new Set());
  const [time, setTime] = useState("08:30");
  const [weeks, setWeeks] = useState(4);
  const [modality, setModality] = useState<TrainingModality>("individual");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [duration, setDuration] = useState(60);
  const [name, setName] = useState("Entrenamiento");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecurringScheduleResult[] | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function onModalityChange(value: TrainingModality) {
    setModality(value);
    const rule = TRAINING_MODALITIES.find((m) => m.value === value);
    if (rule?.defaultCapacity) setMaxCapacity(rule.defaultCapacity);
    else if (value === "custom_group") setMaxCapacity(5);
  }

  // Lunes de la semana actual: punto de partida del patrón. Se asume
  // que el entrenador configura esto para "a partir de esta semana";
  // si la franja de hoy ya pasó, sencillamente esa ocurrencia en
  // concreto no se podrá crear en el pasado (lo validamos al generar).
  const mondayOfFirstWeek = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);

  const slots: RecurringSlotInput[] = useMemo(
    () => Array.from(selectedWeekdays).map((weekday) => ({ weekday, time })),
    [selectedWeekdays, time]
  );

  const occurrences = useMemo(
    () =>
      slots.length > 0
        ? buildRecurringOccurrences(mondayOfFirstWeek, weeks, slots, duration).filter(
            (occ) => new Date(occ.starts_at) > new Date()
          )
        : [],
    [slots, weeks, duration, mondayOfFirstWeek]
  );

  const invalid = slots.length === 0 || occurrences.length === 0 || !maxCapacity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`/api/miembros/${member.id}/horario-recurrente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingModality: modality,
          maxCapacity,
          weeks,
          startsOn: mondayOfFirstWeek.toISOString().slice(0, 10),
          occurrences,
          name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se ha podido crear el horario recurrente.");
        return;
      }
      setResults(data.results);
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const createdCount = results?.filter((r) => r.created).length ?? 0;
  const failedResults = results?.filter((r) => !r.created) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Horario recurrente de ${member.full_name}`}
        onClick={(e) => e.stopPropagation()}
        className="pop-in w-full sm:max-w-lg bg-bg-raised border border-text/70 sm:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)] max-h-[92vh] overflow-y-auto"
      >
        <div className="border-b border-line px-6 py-5">
          <p className="label-mono mb-1">Horario recurrente</p>
          <h2 className="font-display text-2xl leading-none truncate">{member.full_name}</h2>
          <p className="text-sm text-text-dim mt-2">
            Elige los días y la hora fijos del cliente. Se reservarán automáticamente todas las
            sesiones de las próximas semanas.
          </p>
        </div>

        {results ? (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm">
              Se han creado <strong className="text-text">{createdCount}</strong> de{" "}
              {results.length} sesiones.
            </p>
            {failedResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="label-mono !text-danger">No se pudieron crear:</p>
                <ul className="space-y-1">
                  {failedResults.map((r, i) => (
                    <li key={i} className="text-xs bg-danger-bg text-danger px-3 py-2">
                      {formatResultDate(r.starts_at)} — {r.error_message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-accent text-accent-ink py-2.5 font-semibold"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="label-mono block mb-1.5">Días de la semana</label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    aria-pressed={selectedWeekdays.has(day)}
                    className={`py-2.5 text-[11px] font-medium uppercase border transition-colors ${
                      selectedWeekdays.has(day)
                        ? "border-text bg-text text-bg"
                        : "border-line text-text-dim hover:text-text hover:border-text-faint"
                    }`}
                  >
                    {WEEKDAY_LABELS[day].slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-mono block mb-1.5" htmlFor="rec-time">
                  Hora
                </label>
                <input
                  id="rec-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-line bg-bg px-3 py-2.5 text-sm font-mono-ui focus:outline-none focus:border-text"
                />
              </div>
              <div>
                <label className="label-mono block mb-1.5" htmlFor="rec-weeks">
                  Nº de semanas
                </label>
                <input
                  id="rec-weeks"
                  type="number"
                  min={1}
                  max={26}
                  value={weeks}
                  onChange={(e) => setWeeks(Math.max(1, Math.min(26, Number(e.target.value))))}
                  className="w-full border border-line bg-bg px-3 py-2.5 text-sm font-mono-ui focus:outline-none focus:border-text"
                />
              </div>
            </div>

            <div>
              <label className="label-mono block mb-1.5" htmlFor="rec-modality">
                Modalidad
              </label>
              <select
                id="rec-modality"
                value={modality}
                onChange={(e) => onModalityChange(e.target.value as TrainingModality)}
                className="w-full border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:border-text"
              >
                {TRAINING_MODALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {modality === "custom_group" && (
              <div>
                <label className="label-mono block mb-1.5" htmlFor="rec-capacity">
                  Aforo máximo
                </label>
                <input
                  id="rec-capacity"
                  type="number"
                  min={5}
                  max={MAX_GROUP_CAPACITY}
                  value={maxCapacity}
                  onChange={(e) =>
                    setMaxCapacity(Math.min(MAX_GROUP_CAPACITY, Number(e.target.value)))
                  }
                  className="w-full border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:border-text"
                />
                <p className="text-xs text-text-dim mt-1">Máximo {MAX_GROUP_CAPACITY} personas.</p>
              </div>
            )}

            <div>
              <label className="label-mono block mb-1.5" htmlFor="rec-name">
                Nombre de la clase
              </label>
              <input
                id="rec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:border-text"
              />
            </div>

            {slots.length > 0 && (
              <p className="font-mono-ui text-xs text-text-dim">
                Se intentarán crear <strong className="text-text">{occurrences.length}</strong>{" "}
                sesiones ({selectedWeekdays.size}{" "}
                {selectedWeekdays.size === 1 ? "día" : "días"} × {weeks}{" "}
                {weeks === 1 ? "semana" : "semanas"}).
              </p>
            )}

            {error && (
              <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || invalid}
                className="flex-1 bg-accent text-accent-ink py-2.5 font-semibold disabled:opacity-40"
              >
                {loading ? "Creando sesiones…" : "Crear horario recurrente"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs uppercase tracking-wider text-text-dim hover:text-text"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
