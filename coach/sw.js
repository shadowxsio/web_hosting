/*
 * RunCoach — Service Worker (Phase 8, PWA).
 *
 * Trois rôles, tous défensifs :
 *  1. App shell hors-ligne : sert index.html en fallback de navigation,
 *     met en cache les assets statiques en stale-while-revalidate.
 *     Le cache est versionné ; les anciens sont nettoyés à l'activate.
 *  2. Push : affiche la notification reçue (title/body/url depuis le payload).
 *  3. Clic de notification : focus l'onglet RunCoach existant ou en ouvre un.
 *
 * NE TOUCHE JAMAIS au réseau pour /api/* : ces requêtes passent directement
 * (pas de cache), pour ne pas servir des données périmées ni bloquer l'auth.
 */

const CACHE_VERSION = 'runcoach-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

// ── Install : pré-cache l'app shell (best-effort, ne bloque pas si une URL 404).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate : purge les caches d'anciennes versions, prend le contrôle.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : navigation = network-first → fallback cache/index ; assets = SWR.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que le GET. POST/PUT (API, auth…) passent au réseau tels quels.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Hors origine (CDN polices, MapLibre, l'API Cloud Run…) ou /api/* : ne pas
  // intercepter — laisser le navigateur faire sa requête réseau normale.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Requêtes de navigation (chargement de page) : network-first, fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Met à jour l'index en cache pour les prochains démarrages offline.
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Assets statiques (JS/CSS/images/fonts buildés) : stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ── Push : affiche la notification. Payload JSON {title, body, url} (défensif).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'RunCoach';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: 'runcoach-briefing',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic : focus un onglet RunCoach déjà ouvert, sinon ouvre l'URL cible.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate && client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
