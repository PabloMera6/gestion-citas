"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFullDate, formatTime } from "@/lib/date";
import {
  CANCELLATION_LIMIT_HOURS,
  RESCHEDULE_SAME_WEEK_LIMIT_HOURS,
} from "@/lib/types/database";
import type { SessionWithAvailability } from "@/lib/types/database";
import { useToast } from "./ToastProvider";

type Props = {
  bookingId: string;
  currentSessionId: string;
  currentStartsAt: string;
  onClose: () => void;
};

function startOfIsoWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day; // desplazamiento hasta el lunes
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function MoverReservaModal({
  bookingId,
  currentSessionId,
  currentStartsAt,
  onClose,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionWithAvailability[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("sessions_with_availability")
      .select("*")
      .gte("starts_at", new Date().toISOString())
      .eq("is_cancelled", false)
      .order("starts_at")
      .limit(60)
      .returns<SessionWithAvailability[]>()
      .then(({ data }) => {
        setSessions((data ?? []).filter((s) => s.id !== currentSessionId));
        setLoadingList(false);
      });

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
  }, [currentSessionId]);

  const currentWeekStart = useMemo(
    () => startOfIsoWeek(new Date(currentStartsAt)).getTime(),
    [currentStartsAt]
  );
  const hoursUntilCurrent = (new Date(currentStartsAt).getTime() - Date.now()) / 3_600_000;

  async function move(newSessionId: string) {
    setMovingTo(newSessionId);
    setError(null);
    try {
      const response = await fetch(`/api/reservas/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error ?? "No se ha podido mover la reserva.";
        setError(errorMessage);
        showToast(errorMessage, "error");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      const errorMessage = "No se ha podido conectar con el servidor.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setMovingTo(null);
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
        aria-label="Mover reserva"
        onClick={(e) => e.stopPropagation()}
        className="pop-in w-full sm:max-w-lg bg-bg-raised border border-text/70 sm:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)] max-h-[92vh] overflow-y-auto"
      >
        <div className="border-b border-line px-6 py-5">
          <p className="label-mono mb-1">Mover reserva</p>
          <h2 className="font-display text-2xl leading-none">Elige otro horario</h2>
          {hoursUntilCurrent >= RESCHEDULE_SAME_WEEK_LIMIT_HOURS ? (
            <p className="text-sm text-text-dim mt-3">
              Si eliges un horario de <strong className="text-text">esta misma semana</strong>,
              conservas tu bono. Si eliges otra semana, se contará como cancelar y reservar de
              nuevo (perderías el bono de esta sesión y se descontaría otro al reservar).
            </p>
          ) : (
            <p className="text-sm text-text-dim mt-3">
              Quedan menos de {RESCHEDULE_SAME_WEEK_LIMIT_HOURS}h para tu clase: si la mueves,
              contará como cancelar y reservar de nuevo (perderías el bono de esta sesión).
            </p>
          )}
        </div>

        <div className="px-6 py-5">
          {error && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 mb-3">{error}</p>
          )}

          {loadingList ? (
            <p className="text-sm text-text-faint">Cargando horarios disponibles…</p>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-text-faint">No hay otros horarios disponibles ahora mismo.</p>
          ) : (
            <ul className="divide-y divide-line border border-line">
              {sessions.map((s) => {
                const start = new Date(s.starts_at);
                const sameWeek = startOfIsoWeek(start).getTime() === currentWeekStart;
                const keepsCredit = sameWeek && hoursUntilCurrent >= RESCHEDULE_SAME_WEEK_LIMIT_HOURS;
                const full = s.available_spots <= 0;

                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate capitalize">
                        {formatFullDate(start)} · {formatTime(start)}
                      </p>
                      <p className="text-xs text-text-faint truncate">
                        Con {s.trainer_name} · {s.available_spots} {s.available_spots === 1 ? "plaza" : "plazas"}
                      </p>
                      {keepsCredit ? (
                        <p className="text-[10px] text-accent mt-0.5">Conservas tu bono</p>
                      ) : (
                        <p className="text-[10px] text-text-faint mt-0.5">
                          Gasta un bono nuevo{sameWeek ? "" : " · fuera de esta semana"}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={full || movingTo !== null}
                      onClick={() => move(s.id)}
                      className="shrink-0 h-7 px-2.5 border border-text text-[10px] font-semibold uppercase tracking-wider hover:bg-text hover:text-bg transition-colors disabled:opacity-40"
                    >
                      {movingTo === s.id ? "…" : full ? "Completa" : "Elegir"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs uppercase tracking-wider text-text-dim hover:text-text"
          >
            Cerrar sin mover
          </button>
        </div>
      </div>
    </div>
  );
}
