"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReservaButton from "./ReservaButton";
import CrearClaseModal from "./CrearClaseModal";
import {
  getWeekDays,
  formatDayLabel,
  formatMonthLabel,
  formatTime,
  isSameDay,
  isToday,
} from "@/lib/date";
import type { Group, SessionWithAvailability } from "@/lib/types/database";

type Props = {
  weekStartIso: string; // fecha de referencia (ISO) para calcular la semana
  sessions: SessionWithAvailability[];
  myBookingSessionIds: Record<string, string>; // session_id -> booking_id
  isTrainer: boolean;
  groups: Group[];
  currentUserId: string;
};

const START_HOUR = 7;
const END_HOUR = 22;

export default function CalendarioSemana({
  weekStartIso,
  sessions,
  myBookingSessionIds,
  isTrainer,
  groups,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillSlot, setPrefillSlot] = useState<Date | null>(null);

  const reference = new Date(weekStartIso);
  const days = useMemo(() => getWeekDays(reference), [weekStartIso]);
  const now = new Date();

  function goToWeek(delta: number) {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Date(reference);
    next.setDate(next.getDate() + delta * 7);
    params.set("semana", next.toISOString());
    router.push(`/calendario?${params.toString()}`);
  }

  function goToday() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("semana");
    router.push(`/calendario?${params.toString()}`);
  }

  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );

  const sessionsByDay = days.map((day) =>
    sessions
      .filter((s) => isSameDay(new Date(s.starts_at), day))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {formatMonthLabel(reference)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-line bg-bg-raised overflow-hidden">
            <button
              onClick={() => goToWeek(-1)}
              aria-label="Semana anterior"
              className="p-2 hover:bg-bg-raised-hover text-text-dim hover:text-text transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={goToday}
              className="px-3 py-2 text-sm font-medium border-x border-line text-text hover:bg-bg-raised-hover transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => goToWeek(1)}
              aria-label="Semana siguiente"
              className="p-2 hover:bg-bg-raised-hover text-text-dim hover:text-text transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {isTrainer && (
            <button
              onClick={() => {
                setPrefillSlot(null);
                setModalOpen(true);
              }}
              className="rounded-lg bg-accent text-accent-ink px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent transition-colors"
            >
              + Nueva clase
            </button>
          )}
        </div>
      </div>

      {/* Grid semanal: cabecera de días */}
      <div className="overflow-x-auto rounded-xl border border-line bg-bg-raised/60 shadow-xl shadow-black/20">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line sticky top-0 bg-bg-raised z-10">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`px-2 py-3 text-center border-l border-line ${
                  isToday(day) ? "bg-accent/10" : ""
                }`}
              >
                <p className="text-xs text-text-dim capitalize">
                  {formatDayLabel(day).split(" ")[0]}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    isToday(day) ? "text-accent" : "text-text"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>

          <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Columna de horas */}
            <div>
              {hours.map((h) => (
                <div
                  key={h}
                  className="h-20 border-b border-line px-2 pt-1 text-right text-xs text-text-faint"
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {days.map((day, dayIdx) => (
              <div
                key={day.toISOString()}
                className={`relative border-l border-line ${
                  isToday(day) ? "bg-accent/[0.04]" : ""
                }`}
              >
                {hours.map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      if (!isTrainer) return;
                      const slot = new Date(day);
                      slot.setHours(h, 0, 0, 0);
                      setPrefillSlot(slot);
                      setModalOpen(true);
                    }}
                    className={`w-full h-20 border-b border-line block ${
                      isTrainer ? "hover:bg-bg-raised-hover cursor-pointer" : "cursor-default"
                    } transition-colors`}
                  />
                ))}

                {sessionsByDay[dayIdx].map((session) => {
                  const start = new Date(session.starts_at);
                  const end = new Date(session.ends_at);
                  const startOffset =
                    (start.getHours() - START_HOUR) * 80 +
                    (start.getMinutes() / 60) * 80;
                  const durationMin =
                    (end.getTime() - start.getTime()) / 60000;
                  const height = Math.max((durationMin / 60) * 80 - 4, 36);
                  const color = session.trainer_color ?? "#6366f1";
                  const bookingId = myBookingSessionIds[session.id];
                  const isPast = end < now;

                  return (
                    <div
                      key={session.id}
                      style={{
                        top: `${startOffset + 2}px`,
                        height: `${height}px`,
                        borderLeftColor: color,
                        backgroundColor: color + "1a",
                      }}
                      className={`absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 overflow-hidden ${
                        session.is_cancelled || isPast ? "opacity-45" : ""
                      }`}
                    >
                      <p className="text-[11px] font-semibold truncate" style={{ color }}>
                        {session.name}
                      </p>
                      <p className="text-[10px] text-text-dim truncate">
                        {formatTime(start)}–{formatTime(end)} · {session.trainer_name.split(" ")[0]}
                      </p>
                      {session.is_cancelled && (
                        <p className="text-[10px] text-danger font-medium">Cancelada</p>
                      )}
                      {!isTrainer && !session.is_cancelled && height > 55 && (
                        <div className="mt-1 scale-90 origin-left">
                          <ReservaButton
                            sessionId={session.id}
                            bookingId={bookingId}
                            reserved={Boolean(bookingId)}
                            availableSpots={session.available_spots}
                            cancelled={session.is_cancelled}
                            isPast={isPast}
                            startsAt={session.starts_at}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-faint">
        {isTrainer
          ? "Toca una franja horaria vacía para crear una clase."
          : "Toca 'Reservar plaza' en una clase para apuntarte."}
      </p>

      {isTrainer && (
        <CrearClaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          groups={groups}
          prefillDate={prefillSlot}
          trainerId={currentUserId}
        />
      )}
    </div>
  );
}
