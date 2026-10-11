"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CANCELLATION_LIMIT_HOURS } from "@/lib/types/database";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import MoverReservaModal from "./MoverReservaModal";

type Props = {
  sessionId: string;
  bookingId?: string | null;
  reserved: boolean;
  availableSpots: number;
  cancelled: boolean;
  isPast?: boolean;
  startsAt?: string;
  /** Versión mínima (solo iconos en la acción) para huecos estrechos como el calendario */
  compact?: boolean;
  /**
   * Oculta la etiqueta "Reservada" cuando ya está reservada, dejando
   * solo los botones de Mover/Cancelar. Pensado para listas donde el
   * hecho de aparecer ya implica que está reservada (ej. "Mis
   * reservas"), donde la etiqueta es redundante.
   */
  hideReservedTag?: boolean;
  /**
   * Se llama justo antes de abrir el modal de mover. Pensado para
   * cuando este botón vive dentro de otro modal (p.ej. el detalle de
   * clase abierto desde el calendario): permite que ese modal
   * contenedor se cierre primero, para no tener dos modales
   * apilados a la vez.
   */
  onBeforeMove?: () => void;
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="currentColor" className="w-3 h-3 shrink-0" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="currentColor" className="w-3 h-3 shrink-0" aria-hidden>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="currentColor" className="w-3 h-3 shrink-0" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);

// Etiqueta de estado (no interactiva): claramente distinta de un botón
function StateTag({ children, strike = false }: { children: React.ReactNode; strike?: boolean }) {
  return (
    <span
      className={`inline-flex items-center h-6 px-2 border border-dashed border-text-faint text-[10px] font-medium uppercase tracking-wider text-text-dim ${
        strike ? "line-through" : ""
      }`}
    >
      {children}
    </span>
  );
}

export default function ReservaButton({
  sessionId,
  bookingId,
  reserved,
  availableSpots,
  cancelled,
  isPast = false,
  startsAt,
  compact = false,
  hideReservedTag = false,
  onBeforeMove,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const hoursUntilStart = startsAt
    ? (new Date(startsAt).getTime() - Date.now()) / 3_600_000
    : Infinity;
  const withinCancellationWindow = hoursUntilStart < CANCELLATION_LIMIT_HOURS;

  async function reserve() {
    const confirmed = await confirm({
      title: "¿Reservar esta clase?",
      description: "Se descontará un bono de tu saldo disponible.",
      confirmLabel: "Sí, reservar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error ?? "No se ha podido realizar la reserva.";
        setMessage(errorMessage);
        // El texto bajo el botón puede quedar cortado en huecos
        // estrechos (p.ej. dentro de una celda del calendario en
        // móvil), así que el error siempre se refuerza con un aviso
        // flotante que no depende del espacio disponible ahí.
        showToast(errorMessage, "error");
        return;
      }
      router.refresh();
    } catch {
      const errorMessage = "No se ha podido conectar con el servidor.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  async function cancelReservation() {
    if (!bookingId) return;
    const confirmed = await confirm({
      title: "¿Cancelar tu reserva?",
      description: "Se cancelará tu plaza en esta clase y recuperarás el bono, si procede.",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "No, mantener",
      tone: "danger",
    });
    if (!confirmed) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/reservas/${bookingId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error ?? "No se ha podido cancelar la reserva.";
        setMessage(errorMessage);
        showToast(errorMessage, "error");
        return;
      }
      router.refresh();
    } catch {
      const errorMessage = "No se ha podido conectar con el servidor.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  const feedback = message && (
    <p aria-live="polite" className="max-w-44 text-right text-[10px] leading-tight text-danger">
      {message}
    </p>
  );

  // ---------- YA RESERVADA ----------
  if (reserved) {
    if (isPast) return <StateTag>✓ Asististe</StateTag>;

    // La ventana para cancelar y para mover es la misma
    // (CANCELLATION_LIMIT_HOURS, 12h): por debajo de ese margen, la
    // reserva ya no se puede modificar en absoluto.
    const canModify = !withinCancellationWindow;

    // Si se oculta la etiqueta "Reservada" y tampoco hay nada que
    // mover/cancelar (fuera de la ventana permitida), no quedaría
    // nada que mostrar en esta fila: mantenemos la etiqueta en ese
    // caso concreto para no dejar un hueco vacío sin explicación.
    const showReservedTag = !hideReservedTag || !canModify;
    const showMoveButton = canModify && !compact && Boolean(bookingId);
    const showCancelButton = canModify;

    // El separador (border-l) debe caer solo ENTRE dos elementos
    // visibles, nunca antes del primero. Calculando aquí qué va
    // realmente a mostrarse evitamos que las condiciones de cada
    // botón se desincronicen entre sí (que era lo que dejaba un
    // borde "suelto" sin elemento delante).
    const isFirst = (() => {
      if (showReservedTag) return { tag: true, move: false, cancel: false };
      if (showMoveButton) return { tag: false, move: true, cancel: false };
      return { tag: false, move: false, cancel: true };
    })();

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="inline-flex items-stretch h-7 border border-text text-[10px] font-semibold uppercase tracking-wider">
          {showReservedTag && (
            <span className="inline-flex items-center gap-1 px-2 bg-text text-bg">
              <CheckIcon />
              Reservada
            </span>
          )}
          {showMoveButton && (
            <button
              type="button"
              onClick={() => {
                onBeforeMove?.();
                setShowMoveModal(true);
              }}
              disabled={loading}
              aria-label="Mover reserva"
              title="Mover a otro horario"
              className={`inline-flex items-center gap-1 px-2 text-text hover:bg-text hover:text-bg transition-colors disabled:opacity-50 ${
                isFirst.move ? "" : "border-l border-text"
              }`}
            >
              Mover
            </button>
          )}
          {showCancelButton && (
            <button
              type="button"
              onClick={cancelReservation}
              disabled={loading}
              aria-label="Cancelar reserva"
              title="Cancelar reserva"
              className={`inline-flex items-center gap-1 px-2 text-text hover:bg-text hover:text-bg transition-colors disabled:opacity-50 ${
                isFirst.cancel ? "" : "border-l border-text"
              }`}
            >
              {loading ? "…" : compact ? <XIcon /> : "Cancelar"}
            </button>
          )}
        </div>
        {!canModify && !message && !compact && (
          <p className="max-w-44 text-right text-[10px] leading-tight text-text-faint">
            Ya no se puede modificar (menos de {CANCELLATION_LIMIT_HOURS} h).
          </p>
        )}
        {feedback}
        {showMoveModal && bookingId && startsAt && (
          <MoverReservaModal
            bookingId={bookingId}
            currentSessionId={sessionId}
            currentStartsAt={startsAt}
            onClose={() => setShowMoveModal(false)}
          />
        )}
      </div>
    );
  }

  // ---------- NO RESERVADA ----------
  if (cancelled) return <StateTag strike>Cancelada</StateTag>;
  if (isPast) return <StateTag>Finalizada</StateTag>;
  if (availableSpots <= 0) return <StateTag>Completa</StateTag>;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={reserve}
        disabled={loading}
        className="inline-flex items-center gap-1 h-7 px-2.5 border border-text bg-bg text-text text-[10px] font-semibold uppercase tracking-wider hover:bg-text hover:text-bg transition-colors disabled:opacity-50"
      >
        <PlusIcon />
        {loading ? "Reservando…" : "Reservar"}
      </button>
      {feedback}
    </div>
  );
}
