"use client";

import { useState } from "react";
import { formatDayLabel, formatTime, isSameDay } from "@/lib/date";
import type { Group, Profile, SessionWithAvailability } from "@/lib/types/database";

type Props = {
  trainer: Profile;
  groups: Group[];
  sessions: SessionWithAvailability[];
  weekDays: Date[];
  defaultOpen?: boolean;
};

export default function EntrenadorHorario({
  trainer,
  groups,
  sessions,
  weekDays,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const color = trainer.color ?? "#6366f1";
  const initials = trainer.full_name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="rounded-xl border border-line bg-bg-raised overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-bg-raised-hover transition-colors"
      >
        <span
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
          style={{ backgroundColor: color + "26", color }}
        >
          {initials}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{trainer.full_name}</p>
          {trainer.bio ? (
            <p className="text-sm text-text-dim truncate">{trainer.bio}</p>
          ) : (
            <p className="text-sm text-text-faint">
              {groups.length > 0
                ? groups.map((g) => g.name).join(" · ")
                : "Entrenador personal"}
            </p>
          )}
        </div>
        <span className="text-xs text-text-dim shrink-0">
          {sessions.length} {sessions.length === 1 ? "clase" : "clases"} esta semana
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          className={`w-4 h-4 text-text-dim shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line px-5 py-4">
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {groups.map((g) => (
                <span
                  key={g.id}
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: (g.color ?? color) + "26", color: g.color ?? color }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {sessions.length === 0 ? (
            <p className="text-sm text-text-faint py-4 text-center">
              No tiene clases programadas esta semana.
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySessions = sessions
                  .filter((s) => isSameDay(new Date(s.starts_at), day))
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                return (
                  <div key={day.toISOString()} className="min-w-0">
                    <p className="text-[11px] font-medium text-text-faint capitalize mb-1.5 text-center">
                      {formatDayLabel(day)}
                    </p>
                    <div className="space-y-1">
                      {daySessions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-md px-1.5 py-1 text-center"
                          style={{ backgroundColor: color + "1a" }}
                        >
                          <p className="text-[10px] font-semibold truncate" style={{ color }}>
                            {formatTime(new Date(s.starts_at))}
                          </p>
                          <p className="text-[9px] text-text-dim truncate">{s.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
