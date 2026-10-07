"use client";

import { useMemo, useState } from "react";
import AjustarBonosModal from "./AjustarBonosModal";
import HorarioRecurrenteModal from "./HorarioRecurrenteModal";
import { initialsOf } from "@/lib/pattern";
import type { Member } from "@/lib/types/database";

type SortKey = "name" | "credits" | "joined";
type SortDir = "asc" | "desc";
type CreditFilter = "all" | "none" | "low" | "ok";

const CREDIT_FILTERS: { value: CreditFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "none", label: "Sin bonos (0)" },
  { value: "low", label: "Pocos (1–3)" },
  { value: "ok", label: "Con bonos (4+)" },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nombre",
  credits: "Bonos disponibles",
  joined: "Fecha de alta",
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function MiembrosTabla({
  initialMembers,
}: {
  initialMembers: Member[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("all");
  const [minCredits, setMinCredits] = useState("");
  const [maxCredits, setMaxCredits] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [adjusting, setAdjusting] = useState<Member | null>(null);
  const [schedulingRecurring, setSchedulingRecurring] = useState<Member | null>(null);

  function setCredits(id: string, credits: number) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, class_credits: credits } : m))
    );
  }

  async function quickAdjust(member: Member, delta: 1 | -1) {
    setRowError(null);
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/miembros/${member.id}/bonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRowError({ id: member.id, message: data.error ?? "No se ha podido actualizar." });
        return;
      }
      setCredits(member.id, data.credits);
    } catch {
      setRowError({ id: member.id, message: "No se ha podido conectar con el servidor." });
    } finally {
      setBusyId(null);
    }
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Por defecto: texto A→Z, números de mayor a menor
      setSortDir(key === "credits" || key === "joined" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const min = minCredits === "" ? null : Number(minCredits);
    const max = maxCredits === "" ? null : Number(maxCredits);

    const list = members.filter((m) => {
      if (q) {
        const haystack = normalize(
          `${m.full_name} ${m.phone ?? ""}`
        );
        if (!haystack.includes(q)) return false;
      }
      if (creditFilter === "none" && m.class_credits !== 0) return false;
      if (creditFilter === "low" && !(m.class_credits >= 1 && m.class_credits <= 3)) return false;
      if (creditFilter === "ok" && m.class_credits < 4) return false;
      if (min !== null && !Number.isNaN(min) && m.class_credits < min) return false;
      if (max !== null && !Number.isNaN(max) && m.class_credits > max) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "credits":
          return (a.class_credits - b.class_credits) * dir || a.full_name.localeCompare(b.full_name, "es");
        case "joined":
          return (a.created_at.localeCompare(b.created_at)) * dir;
        default:
          return a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" }) * dir;
      }
    });
    return list;
  }, [members, query, creditFilter, minCredits, maxCredits, sortKey, sortDir]);

  const totalCredits = members.reduce((acc, m) => acc + m.class_credits, 0);
  const withoutCredits = members.filter((m) => m.class_credits === 0).length;
  const activeFilters =
    query !== "" ||
    creditFilter !== "all" ||
    minCredits !== "" ||
    maxCredits !== "";

  function resetFilters() {
    setQuery("");
    setCreditFilter("all");
    setMinCredits("");
    setMaxCredits("");
  }

  function sortHeader(k: SortKey, className = "") {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        aria-label={`Ordenar por ${SORT_LABELS[k]}`}
        className={`label-mono inline-flex items-center gap-1 hover:!text-text transition-colors ${
          active ? "!text-text" : ""
        } ${className}`}
      >
        {SORT_LABELS[k]}
        <span aria-hidden className="w-3 inline-block">
          {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: "Miembros", value: members.length },
          { label: "Bonos en circulación", value: totalCredits },
          { label: "Sin bonos", value: withoutCredits },
        ].map((stat) => (
          <div key={stat.label} className="border border-line bg-bg-raised px-4 py-3">
            <p className="label-mono">{stat.label}</p>
            <p className="font-display text-4xl leading-none mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="border border-line bg-bg-raised p-4 mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              stroke="currentColor"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
              aria-hidden
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, apellidos o teléfono…"
              aria-label="Buscar miembros"
              className="w-full border border-line bg-bg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-text"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sortKey}
              onChange={(e) => {
                const k = e.target.value as SortKey;
                setSortKey(k);
                setSortDir(k === "credits" || k === "joined" ? "desc" : "asc");
              }}
              aria-label="Ordenar por"
              className="border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  Ordenar: {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={`Sentido: ${sortDir === "asc" ? "ascendente" : "descendente"}`}
              className="border border-line px-3 font-mono-ui text-sm hover:border-text transition-colors"
            >
              {sortDir === "asc" ? "A→Z ↑" : "Z→A ↓"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="label-mono mb-1.5">Bonos</p>
            <div className="flex flex-wrap gap-1.5">
              {CREDIT_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setCreditFilter(f.value)}
                  aria-pressed={creditFilter === f.value}
                  className={`border px-3 py-1.5 text-xs transition-colors ${
                    creditFilter === f.value
                      ? "border-text bg-text text-bg font-semibold"
                      : "border-line text-text-dim hover:text-text hover:border-text-faint"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label-mono mb-1.5">Rango de bonos</p>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={minCredits}
                onChange={(e) => setMinCredits(e.target.value)}
                placeholder="mín"
                aria-label="Mínimo de bonos"
                className="w-16 border border-line bg-bg px-2 py-1.5 text-xs font-mono-ui focus:outline-none focus:border-text"
              />
              <span className="text-text-faint">–</span>
              <input
                type="number"
                min={0}
                value={maxCredits}
                onChange={(e) => setMaxCredits(e.target.value)}
                placeholder="máx"
                aria-label="Máximo de bonos"
                className="w-16 border border-line bg-bg px-2 py-1.5 text-xs font-mono-ui focus:outline-none focus:border-text"
              />
            </div>
          </div>

          {activeFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs uppercase tracking-wider underline underline-offset-4 text-text-dim hover:text-text ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <p className="label-mono mb-2" aria-live="polite">
        Mostrando {filtered.length} de {members.length}
      </p>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-line px-6 py-12 text-center text-text-dim text-sm">
          {members.length === 0
            ? "Todavía no hay miembros registrados."
            : "Ningún miembro coincide con los filtros."}
        </div>
      ) : (
        <div className="border border-line bg-bg-raised">
          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_200px] gap-4 px-4 py-2.5 border-b border-text/60">
            {sortHeader("name", "justify-self-start")}
            <span className="label-mono">Teléfono</span>
            {sortHeader("credits", "justify-self-end")}
          </div>

          <ul className="divide-y divide-line">
            {filtered.map((m) => {
              const busy = busyId === m.id;
              return (
                <li key={m.id} className="px-4 py-3">
                  <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_200px] gap-x-4 gap-y-2 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full border border-text flex items-center justify-center text-xs font-semibold shrink-0">
                        {initialsOf(m.full_name)}
                      </span>
                      <p className="font-medium truncate">{m.full_name}</p>
                    </div>


                    <p className="font-mono-ui text-sm text-text-dim">
                      <span className="md:hidden label-mono mr-2">Tel</span>
                      {m.phone ?? <span className="text-text-faint">—</span>}
                    </p>

                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => quickAdjust(m, -1)}
                          disabled={busy || m.class_credits === 0}
                          aria-label={`Restar un bono a ${m.full_name}`}
                          className="w-8 h-8 border border-line hover:border-text hover:bg-text hover:text-bg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text disabled:hover:border-line font-mono-ui"
                        >
                          −
                        </button>
                        <span
                          className={`font-display text-3xl leading-none w-11 text-center ${
                            m.class_credits === 0 ? "text-text-faint" : ""
                          }`}
                          aria-label={`${m.class_credits} bonos`}
                        >
                          {m.class_credits}
                        </span>
                        <button
                          type="button"
                          onClick={() => quickAdjust(m, 1)}
                          disabled={busy}
                          aria-label={`Añadir un bono a ${m.full_name}`}
                          className="w-8 h-8 border border-line hover:border-text hover:bg-text hover:text-bg transition-colors disabled:opacity-30 font-mono-ui"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdjusting(m)}
                        className="label-mono border border-line px-2 h-8 hover:!text-text hover:border-text transition-colors"
                        title="Ajustar varios bonos y ver historial"
                      >
                        Ajustar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchedulingRecurring(m)}
                        className="label-mono border border-line px-2 h-8 hover:!text-text hover:border-text transition-colors"
                        title="Configurar horario fijo semanal"
                      >
                        Horario fijo
                      </button>
                    </div>
                  </div>
                  {rowError?.id === m.id && (
                    <p className="text-xs text-danger bg-danger-bg px-3 py-1.5 mt-2">
                      {rowError.message}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {adjusting && (
        <AjustarBonosModal
          member={members.find((m) => m.id === adjusting.id) ?? adjusting}
          onClose={() => setAdjusting(null)}
          onChanged={setCredits}
        />
      )}

      {schedulingRecurring && (
        <HorarioRecurrenteModal
          member={members.find((m) => m.id === schedulingRecurring.id) ?? schedulingRecurring}
          onClose={() => setSchedulingRecurring(null)}
        />
      )}
    </div>
  );
}
