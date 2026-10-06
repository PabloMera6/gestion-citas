// Service worker mínimo para la PWA de Bíbelo.
//
// Objetivo: que la app se instale y abra rápido (shell cacheado),
// SIN cachear nunca llamadas a /api/ ni navegaciones de página,
// porque en un gimnasio es crítico que el calendario y las reservas
// se vean siempre al minuto, nunca una versión offline desactualizada.

const CACHE_VERSION = "bibelo-v1";
const SHELL_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nunca interceptar llamadas a la API ni peticiones que no sean GET:
  // las reservas, el calendario y los datos de Supabase deben ir
  // siempre a red, nunca servirse desde caché.
  if (url.pathname.startsWith("/api/") || request.method !== "GET") {
    return;
  }

  // Solo servimos desde caché los assets estáticos del "shell" de la
  // app (iconos, manifest). Todo lo demás (páginas, datos) va directo
  // a red para no arriesgarnos a mostrar información desactualizada.
  const isShellAsset = SHELL_ASSETS.some((asset) => url.pathname === asset);
  if (!isShellAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
