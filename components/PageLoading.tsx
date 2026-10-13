import Spinner from "./Spinner";

/**
 * Pantalla de carga mostrada automáticamente por Next.js mientras un
 * Server Component de una ruta hace sus consultas (ver loading.tsx en
 * cada carpeta de app/(app)/). Sin esto, la navegación entre páginas
 * se queda en blanco o en la pantalla anterior sin ningún aviso
 * mientras carga, dando sensación de que la app se ha quedado
 * colgada.
 */
export default function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-dim">
      <Spinner size={28} />
      <p className="label-mono">Cargando…</p>
    </div>
  );
}
