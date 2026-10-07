"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFullDate, formatTime } from "@/lib/date";
import { initialsOf, trainerPatternClass } from "@/lib/pattern";
import type {
  Profile,
  SessionMember,
  SessionWithAvailability,
} from "@/lib/types/database";

type Props = {
  session: SessionWithAvailability;
  trainer: Profile;
  members: SessionMember[];
  onClose: () => void;
  /** Solo el entrenador dueño de la clase puede cancelarla/reactivarla */
  canManage?: boolean;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-line px-3 py-2.5">
      <p className="label-mono mb-1">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function DetalleClaseModal({
  session,
  trainer,
  members,
  onClose,
  canManage = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [onClose]);

  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  const taken = session.max_capacity - session.available_spots;
  const isPast = end < new Date();
  const fillPct = Math.min(100, Math.round((taken / session.max_capacity) * 100));

  async function toggleCancelled() {
    const goingToCancel = !session.is_cancelled;
    if (
      goingToCancel &&
      !window.confirm(
        members.length > 0
          ? `¿Cancelar esta clase? Se cancelará la reserva de ${members.length} ${
              members.length === 1 ? "persona y se le devolverá su bono" : "personas y se les devolverá su bono"
            }.`
          : "¿Cancelar esta clase?"
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sesiones/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCancelled: goingToCancel }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se ha podido actualizar la clase.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de la clase ${session.name}`}
        onClick={(e) => e.stopPropagation()}
        className="pop-in w-full sm:max-w-xl bg-bg-raised border border-text/70 sm:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)] max-h-[92vh] overflow-y-auto"
      >
        {/* Cabecera */}
        <div className={`relative border-b border-text/70 px-6 pt-6 pb-5 ${trainerPatternClass(session.trainer_id)}`}>
          <div className="bg-bg-raised/90 -mx-2 -my-1 px-2 py-1 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {session.is_cancelled && (
                  <span className="label-mono border border-text px-2 py-0.5 !text-text line-through">
                    Cancelada
                  </span>
                )}
                {!session.is_cancelled && isPast && (
                  <span className="label-mono border border-line px-2 py-0.5">
                    Finalizada
                  </span>
                )}
                {session.group_name && (
                  <span className="label-mono border border-line px-2 py-0.5">
                    {session.group_name}
                  </span>
                )}
              </div>
              <p className="label-mono mb-1">Reserva · {formatTime(start)}</p>
              <h2 className="font-display text-3xl leading-none break-words">
                {members.length > 0
                  ? members.map((m) => m.full_name).join(" · ")
                  : "Sin cliente reservado"}
              </h2>
              <p className="text-xs text-text-dim mt-1">{session.name}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-text-dim hover:text-text p-1 shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Datos principales */}
          <div className="grid grid-cols-2 gap-2">
            <Row label="Fecha">
              <span className="capitalize">{formatFullDate(start)}</span>
            </Row>
            <Row label="Horario">
              <span className="font-mono-ui">
                {formatTime(start)} – {formatTime(end)}
              </span>{" "}
              <span className="text-text-dim">({durationMin} min)</span>
            </Row>
            <Row label="Modalidad">
              {session.training_modality === "individual"
                ? "Individual"
                : session.training_modality === "duo"
                ? "Dúo"
                : session.training_modality === "group3"
                ? "Grupal · 3 personas"
                : session.training_modality === "group4"
                ? "Grupal · 4 personas"
                : `Grupal · ${session.max_capacity} personas`}
            </Row>
            <Row label="Entrenador">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-text flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {initialsOf(trainer.full_name)}
                </span>
                {trainer.full_name}
              </span>
            </Row>
            <Row label="Aforo">
              <span className="font-mono-ui">
                {taken}/{session.max_capacity}
              </span>{" "}
              <span className="text-text-dim">
                {session.available_spots > 0
                  ? `· ${session.available_spots} libres`
                  : "· completa"}
              </span>
              <div className="h-1.5 border border-line mt-2" aria-hidden>
                <div className="h-full bg-text" style={{ width: `${fillPct}%` }} />
              </div>
            </Row>
          </div>

          {/* Descripción */}
          <div>
            <p className="label-mono mb-2">Descripción</p>
            {session.description ? (
              <p className="text-sm text-text-dim whitespace-pre-wrap">
                {session.description}
              </p>
            ) : (
              <p className="text-sm text-text-faint">Esta clase no tiene descripción.</p>
            )}
          </div>

          {trainer.bio && (
            <div>
              <p className="label-mono mb-2">Sobre {trainer.full_name.split(" ")[0]}</p>
              <p className="text-sm text-text-dim">{trainer.bio}</p>
            </div>
          )}

          {/* Miembros */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label-mono">Miembros apuntados</p>
              <p className="font-display text-xl leading-none">{members.length}</p>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-text-faint border border-dashed border-line px-3 py-5 text-center">
                Todavía no hay nadie apuntado.
              </p>
            ) : (
              <ul className="border border-line divide-y divide-line">
                {members.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="font-mono-ui text-[11px] text-text-faint w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                      {m.phone && (
                        <p className="font-mono-ui text-[11px] text-text-dim">{m.phone}</p>
                      )}
                    </div>
                    {m.class_credits !== null && (
                      <span
                        className="label-mono border border-line px-2 py-1 shrink-0"
                        title="Bonos de clases disponibles"
                      >
                        {m.class_credits} {m.class_credits === 1 ? "bono" : "bonos"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canManage && !isPast && (
            <div className="border-t border-line pt-4">
              {error && (
                <p className="text-sm text-danger bg-danger-bg px-3 py-2 mb-3">{error}</p>
              )}
              <button
                type="button"
                onClick={toggleCancelled}
                disabled={loading}
                className={`w-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  session.is_cancelled
                    ? "bg-accent text-accent-ink"
                    : "border border-danger text-danger hover:bg-danger hover:text-white"
                }`}
              >
                {loading
                  ? "Guardando…"
                  : session.is_cancelled
                  ? "Reactivar clase"
                  : "Cancelar clase"}
              </button>
              {!session.is_cancelled && members.length > 0 && (
                <p className="text-xs text-text-dim mt-2 text-center">
                  Se cancelará la reserva de las {members.length} personas apuntadas y recuperarán su bono.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
