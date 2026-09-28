"use client";

import { useEffect, useState } from "react";
import type { CreditMovement, Member } from "@/lib/types/database";

type Props = {
  member: Member;
  onClose: () => void;
  onChanged: (memberId: string, credits: number) => void;
};

const QUICK = [1, 5, 10];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AjustarBonosModal({ member, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");
  const [credits, setCredits] = useState(member.class_credits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CreditMovement[] | null>(null);

  async function loadHistory() {
    try {
      const res = await fetch(`/api/miembros/${member.id}/bonos`);
      const data = await res.json();
      setHistory(res.ok ? data.movements : []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
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

  const delta = mode === "add" ? amount : -amount;
  const preview = credits + delta;
  const invalid = !Number.isInteger(amount) || amount < 1 || amount > 100 || preview < 0;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/miembros/${member.id}/bonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se han podido actualizar los bonos.");
        return;
      }
      setCredits(data.credits);
      onChanged(member.id, data.credits);
      setReason("");
      setAmount(1);
      loadHistory();
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
        aria-label={`Ajustar bonos de ${member.full_name}`}
        onClick={(e) => e.stopPropagation()}
        className="pop-in w-full sm:max-w-md bg-bg-raised border border-text/70 sm:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)] max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="label-mono mb-1">Ajustar bonos</p>
            <h2 className="font-display text-2xl leading-none truncate">
              {member.full_name}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="label-mono">Saldo</p>
            <p className="font-display text-5xl leading-none">{credits}</p>
          </div>
        </div>

        <form onSubmit={apply} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["add", "sub"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`border py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                  mode === m
                    ? "border-text bg-text text-bg"
                    : "border-line text-text-dim hover:text-text hover:border-text-faint"
                }`}
              >
                {m === "add" ? "+ Añadir" : "− Restar"}
              </button>
            ))}
          </div>

          <div>
            <label className="label-mono block mb-1.5" htmlFor="bonos-amount">
              Cantidad
            </label>
            <div className="flex gap-2">
              <input
                id="bonos-amount"
                type="number"
                min={1}
                max={100}
                value={Number.isNaN(amount) ? "" : amount}
                onChange={(e) => setAmount(e.target.valueAsNumber)}
                className="w-24 border border-line bg-bg px-3 py-2.5 text-sm font-mono-ui focus:outline-none focus:border-text"
              />
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className="border border-line px-3 text-sm font-mono-ui text-text-dim hover:text-text hover:border-text transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-mono block mb-1.5" htmlFor="bonos-reason">
              Motivo (opcional)
            </label>
            <input
              id="bonos-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="Pago de bono de 10 clases, regalo, corrección…"
              className="w-full border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:border-text"
            />
          </div>

          <p className="font-mono-ui text-xs text-text-dim">
            {credits} → <span className="text-text font-bold">{Number.isNaN(preview) ? "—" : preview}</span>
            {preview < 0 && (
              <span className="ml-2 text-text">· no puede quedar en negativo</span>
            )}
          </p>

          {error && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || invalid}
              className="flex-1 bg-accent text-accent-ink py-2.5 font-semibold disabled:opacity-40"
            >
              {loading ? "Guardando…" : mode === "add" ? "Añadir bonos" : "Restar bonos"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs uppercase tracking-wider text-text-dim hover:text-text"
            >
              Cerrar
            </button>
          </div>
        </form>

        <div className="border-t border-line px-6 py-5">
          <p className="label-mono mb-3">Últimos movimientos</p>
          {history === null ? (
            <p className="text-sm text-text-faint">Cargando…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-text-faint">Sin movimientos todavía.</p>
          ) : (
            <ul className="divide-y divide-line border border-line">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={`font-mono-ui text-sm font-bold w-10 shrink-0 ${
                      h.delta > 0 ? "" : "line-through decoration-2"
                    }`}
                  >
                    {h.delta > 0 ? `+${h.delta}` : h.delta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">
                      {h.reason ?? <span className="text-text-faint">Sin motivo</span>}
                    </p>
                    <p className="font-mono-ui text-[10px] text-text-faint">
                      {formatWhen(h.created_at)}
                      {h.trainer_name ? ` · ${h.trainer_name}` : ""}
                    </p>
                  </div>
                  <span className="font-mono-ui text-[11px] text-text-dim shrink-0">
                    = {h.balance_after}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
