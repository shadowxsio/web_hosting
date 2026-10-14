// TrailStrong a déménagé sur https://strong.trailsuite.app.
// Ce service worker remplace celui de l'ancienne copie (même adresse, donc mis à jour tout seul à la
// prochaine ouverture) : il retire SES fichiers des caches, se désinscrit et renvoie les pages ouvertes
// vers la nouvelle adresse. Attention, l'origine shadowxsio.github.io est partagée avec d'autres apps
// (dont le vrai TrailStrong, même nom de cache) : on ne supprime que ce qui est sous /web_hosting/trailstrong/.
const OLD = new URL('./', self.registration.scope).pathname
const NEW_URL = 'https://strong.trailsuite.app/'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name)
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname.startsWith(OLD)) await cache.delete(req)
        }
      }
      await self.registration.unregister()
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(NEW_URL)
    })(),
  )
})
