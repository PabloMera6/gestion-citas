"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ConfirmTone = "default" | "danger";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface PendingConfirm extends Required<Omit<ConfirmOptions, "description">> {
  description?: string;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  /** Muestra un modal de confirmación y resuelve a true/false según la elección del usuario. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Confirmación centralizada para acciones que no deberían poder
 * dispararse por una pulsación accidental (reservar, cancelar, mover,
 * etc.). Sustituye a window.confirm por un modal con el mismo estilo
 * visual que el resto de la app, y queda disponible desde cualquier
 * componente vía useConfirm().
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Confirmar",
        cancelLabel: options.cancelLabel ?? "Cancelar",
        tone: options.tone ?? "default",
        resolve,
      });
    });
  }, []);

  function respond(confirmed: boolean) {
    pending?.resolve(confirmed);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    confirmButtonRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") respond(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-0 sm:px-4"
          onClick={() => respond(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.description ? "confirm-description" : undefined}
            onClick={(e) => e.stopPropagation()}
            className="pop-in w-full sm:max-w-sm bg-bg-raised border border-text/70 sm:shadow-[8px_8px_0_0_rgba(255,255,255,0.15)]"
          >
            <div className="px-6 py-5">
              <h2 id="confirm-title" className="font-display text-xl leading-tight">
                {pending.title}
              </h2>
              {pending.description && (
                <p id="confirm-description" className="text-sm text-text-dim mt-2">
                  {pending.description}
                </p>
              )}
            </div>
            <div className="border-t border-line px-6 py-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => respond(false)}
                className="flex-1 py-2.5 text-xs uppercase tracking-wider text-text-dim hover:text-text border border-line"
              >
                {pending.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => respond(true)}
                className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-semibold transition-colors ${
                  pending.tone === "danger"
                    ? "bg-danger-bg text-danger border border-danger hover:bg-danger hover:text-bg"
                    : "bg-accent text-accent-ink hover:opacity-90"
                }`}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  }
  return ctx.confirm;
}
