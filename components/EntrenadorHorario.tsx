"use client";

import { useState } from "react";
import { formatDayLabel, formatTime, isSameDay } from "@/lib/date";
import { initialsOf, trainerPatternClass } from "@/lib/pattern";
import DetalleClaseModal from "./DetalleClaseModal";
import type {
  Group,
  Profile,
  SessionMember,
  SessionWithAvailability,
} from "@/lib/types/database";

type Props = {
  trainer: Profile;
  groups: Group[];
  sessions: SessionWithAvailability[];
  weekDays: Date[];
  defaultOpen?: boolean;
  /** Solo los entrenadores pueden abrir el detalle (con miembros) de una clase */
  canViewDetail?: boolean;
  membersBySession?: Record<string, SessionMember[]>;
};

export default function EntrenadorHorario({
  trainer,
  groups,
  sessions,
  weekDays,
  defaultOpen = false,
  canViewDetail = false,
  membersBySession = {},
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="border border-line bg-bg-raised overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-bg-raised-hover transition-colors"
      >
        <span
          className={`w-11 h-11 rounded-full border-2 border-text flex items-center justify-center text-sm font-semibold shrink-0 ${trainerPatternClass(
            trainer.id
          )}`}
        >
          <span className="bg-bg-raised px-1 leading-none py-0.5">
            {initialsOf(trainer.full_name)}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl leading-none">{trainer.full_name}</p>
          {trainer.bio ? (
            <p className="text-sm text-text-dim truncate mt-1">{trainer.bio}</p>
          ) : (
            <p className="text-sm text-text-faint mt-1">
              {groups.length > 0
                ? groups.map((g) => g.name).join(" · ")
                : "Entrenador personal"}
            </p>
          )}
        </div>
        <span className="label-mono shrink-0 hidden sm:block">
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
                <span key={g.id} className="label-mono border border-line px-2.5 py-1">
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
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-[640px]">
                {weekDays.map((day) => {
                  const daySessions = sessions
                    .filter((s) => isSameDay(new Date(s.starts_at), day))
                    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                  return (
                    <div key={day.toISOString()} className="min-w-0">
                      <p className="label-mono capitalize mb-1.5 text-center">
                        {formatDayLabel(day)}
                      </p>
                      <div className="space-y-1">
                        {daySessions.map((s) => {
                          const content = (
                            <>
                              <p className="font-mono-ui text-[10px] font-bold">
                                {formatTime(new Date(s.starts_at))}
                              </p>
                              <p
                                className={`text-[10px] text-text-dim truncate ${
                                  s.is_cancelled ? "line-through" : ""
                                }`}
                              >
                                {s.name}
                              </p>
                              {canViewDetail && (
                                <p className="label-mono !text-[8.5px] mt-0.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                                  Ver detalle →
                                </p>
                              )}
                            </>
                          );
                          const base = `border border-line border-l-[3px] border-l-text px-1.5 py-1 text-center ${trainerPatternClass(
                            trainer.id
                          )}`;
                          return canViewDetail ? (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedId(s.id)}
                              aria-label={`Ver detalle de ${s.name}`}
                              className={`group w-full bg-bg hover:bg-bg-raised-hover hover:border-text transition-colors cursor-pointer ${base} ${
                                s.is_cancelled ? "opacity-50" : ""
                              }`}
                            >
                              {content}
                            </button>
                          ) : (
                            <div key={s.id} className={`bg-bg ${base}`}>
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {canViewDetail && sessions.length > 0 && (
            <p className="label-mono mt-3 !text-text-faint">
              Pulsa una clase para ver su detalle y sus miembros.
            </p>
          )}
        </div>
      )}

      {selected && (
        <DetalleClaseModal
          session={selected}
          trainer={trainer}
          members={membersBySession[selected.id] ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
