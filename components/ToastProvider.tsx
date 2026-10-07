"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "error" | "success" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Aviso global (tipo "push" dentro de la propia app) que flota encima
 * de todo, independientemente de dónde se dispare. Antes, los errores
 * de reserva (p.ej. "no tienes bonos") se pintaban como texto pequeño
 * debajo del botón que los originó; en el calendario, dentro de una
 * celda estrecha con overflow-hidden, ese texto quedaba cortado o
 * invisible en móvil. Este toast no depende del espacio del sitio que
 * lo dispara: se monta una vez en la raíz de la app y siempre tiene
 * sitio en la pantalla.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playErrorSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      // Dos tonos cortos y graves descendentes: reconocible como "error"
      // sin ser agresivo. Generado con osciladores, sin ficheros de
      // audio que cargar ni descargar.
      const now = ctx.currentTime;
      [440, 330].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.11;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // Si el navegador bloquea audio (p.ej. sin interacción previa),
      // simplemente no suena; el toast visual sigue apareciendo igual.
    }
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "error") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      if (kind === "error") playErrorSound();
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [playErrorSound]
  );

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed inset-x-0 bottom-20 sm:bottom-6 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto max-w-sm w-full sm:w-auto border px-4 py-3 text-sm font-medium shadow-[4px_4px_0_0_rgba(0,0,0,0.25)] cursor-pointer animate-toast-in ${
              toast.kind === "error"
                ? "bg-danger-bg border-danger text-danger"
                : toast.kind === "success"
                ? "bg-accent border-accent text-accent-ink"
                : "bg-bg-raised border-line text-text"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
