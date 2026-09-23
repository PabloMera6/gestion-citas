"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoAnuncioForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError("Escribe un título y un contenido.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/anuncios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pinned }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se ha podido publicar.");
        return;
      }

      setTitle("");
      setContent("");
      setPinned(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-lg bg-accent text-accent-ink px-4 py-2.5 text-sm font-semibold shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent transition-colors"
      >
        + Publicar anuncio
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-line bg-bg-raised p-4 space-y-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del anuncio"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe el mensaje para tus clientes…"
        rows={3}
        className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-text-dim">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="rounded border-line accent-accent"
          />
          Fijar arriba del todo
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm text-text-dim hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent text-accent-ink px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20 hover:bg-accent-hover active:bg-accent transition-colors disabled:opacity-50 disabled:hover:bg-accent"
          >
            {loading ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
