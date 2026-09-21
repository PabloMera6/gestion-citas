"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  reserved: boolean;
  availableSpots: number;
  cancelled: boolean;
};

export default function ReservaButton({
  sessionId,
  reserved,
  availableSpots,
  cancelled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const disabled = loading || cancelled || reserved || availableSpots <= 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={reserve}
        disabled={disabled}
        className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition ${
          reserved
            ? "bg-emerald-100 text-emerald-800"
            : cancelled || availableSpots <= 0
              ? "bg-neutral-100 text-neutral-400"
              : "bg-neutral-900 text-white hover:bg-neutral-800"
        } disabled:cursor-not-allowed`}
      >
        {loading
          ? "Reservando..."
          : reserved
            ? "Reservada"
            : cancelled
              ? "Cancelada"
              : availableSpots <= 0
                ? "Completa"
                : "Reservar"}
      </button>
      {message && (
        <p aria-live="polite" className="max-w-48 text-right text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
