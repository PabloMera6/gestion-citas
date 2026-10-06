import type { ReactNode } from "react";

const WORDS = ["FUERZA", "CARDIO", "HIIT", "MOVILIDAD", "RESISTENCIA", "CONSTANCIA"];

function Ticker() {
  const items = [...WORDS, ...WORDS];
  return (
    <div className="border-y border-text overflow-hidden py-2.5 select-none" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {items.map((w, i) => (
              <span key={`${k}-${i}`} className="font-display text-lg tracking-widest px-5 flex items-center gap-10">
                {w}
                <span className="text-text-faint">✕</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="hidden lg:flex flex-col justify-between border-r border-text px-12 py-10 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img src="/Bibelo.jpg" alt="Bíbelo" className="h-10 w-auto max-w-40 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>

        <div className="relative">
          <img
            src="/Bibelo.jpg"
            alt=""
            className="w-full max-w-md object-contain select-none"
            aria-hidden
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <p className="label-mono mt-3">Est. 2026 · Club de entrenamiento</p>
          <div className="hazard h-3 w-48 mt-6" aria-hidden />
        </div>

        <div>
          <p className="text-text-dim max-w-xs text-sm mb-8">
            Reserva tus clases, consulta el horario de los entrenadores y no
            te pierdas ningún aviso.
          </p>
          <Ticker />
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
