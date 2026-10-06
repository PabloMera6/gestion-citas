"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA. Componente invisible, sin UI:
 * solo dispara el registro una vez montada la app en el cliente.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (navegador no compatible, etc.) no
        // rompemos nada: la web sigue funcionando igual, simplemente
        // sin capacidad de instalación/offline.
      });
    }
  }, []);

  return null;
}
