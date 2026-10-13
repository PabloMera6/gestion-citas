/**
 * Indicador de carga en línea, para usar dentro de botones u otros
 * elementos compactos mientras una acción está en curso (reservar,
 * cancelar, mover, iniciar sesión...). No sustituye a los loading.tsx
 * de cada ruta (eso cubre la navegación entre páginas); este cubre
 * las acciones puntuales dentro de una misma pantalla.
 */
export default function Spinner({
  className = "",
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
