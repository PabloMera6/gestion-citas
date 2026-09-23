"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CANCELLATION_LIMIT_HOURS } from "@/lib/types/database";

type Props = {
  sessionId: string;
  bookingId?: string | null;
  reserved: boolean;
  availableSpots: number;
  cancelled: boolean;
  isPast?: boolean;
  startsAt?: string;
};

export default function ReservaButton({
  sessionId,
  bookingId,
  reserved,
  availableSpots,
  cancelled,
  isPast = false,
  startsAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hoursUntilStart = startsAt
    ? (new Date(startsAt).getTime() - Date.now()) / 3_600_000
    : Infinity;
  const withinCancellationWindow = hoursUntilStart < CANCELLATION_LIMIT_HOURS;

  async function reserve() {
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
        setMessage(data.error ?? "No se ha podido realizar la reserva.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelReservation() {
    if (!bookingId) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/reservas/${bookingId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "No se ha podido cancelar la reserva.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (reserved) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={cancelReservation}
          disabled={loading || isPast || withinCancellationWindow}
          className="min-h-10 rounded-lg px-4 py-2 text-sm font-medium border border-line text-text-dim hover:text-danger hover:border-danger/50 hover:bg-danger-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-dim disabled:hover:border-line disabled:hover:bg-transparent"
        >
          {loading
            ? "Cancelando…"
            : isPast
              ? "Asististe"
              : withinCancellationWindow
                ? "Reservada"
                : "Reservada · Cancelar"}
        </button>
        {!isPast && withinCancellationWindow && !message && (
          <p className="max-w-48 text-right text-xs text-text-faint">
            Quedan menos de {CANCELLATION_LIMIT_HOURS}h, ya no se puede cancelar.
          </p>
        )}
        {message && (
          <p aria-live="polite" className="max-w-48 text-right text-xs text-danger">
            {message}
          </p>
        )}
      </div>
    );
  }

  const disabled = loading || cancelled || isPast || availableSpots <= 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={reserve}
        disabled={disabled}
        className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          disabled
            ? "bg-bg-raised-hover text-text-faint cursor-not-allowed"
            : "bg-accent text-accent-ink shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent"
        }`}
      >
        {loading
          ? "Reservando…"
          : cancelled
            ? "Cancelada"
            : isPast
              ? "Finalizada"
              : availableSpots <= 0
                ? "Completa"
                : "Reservar plaza"}
      </button>
      {message && (
        <p aria-live="polite" className="max-w-48 text-right text-xs text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
