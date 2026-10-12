import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Génère dist/sw.js au build : précache de TOUS les fichiers émis
 * (index.html, JS/CSS hashés, icônes, manifest) pour un usage 100 % hors-ligne
 * au sous-sol du gym. La version du cache dérive du contenu → chaque déploiement
 * invalide proprement l'ancien cache.
 */
function serviceWorker(): Plugin {
  return {
    name: 'trailstrong-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      // Tout public/ (icônes, manifest, photos de démo) est précaché pour le hors-ligne.
      const walk = (dir: string, rel = ''): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(join(dir, e.name), `${rel}${e.name}/`) : [`${rel}${e.name}`],
        )
      const publicFiles = walk(fileURLToPath(new URL('./public', import.meta.url)))
      const urls = ['./', ...new Set([...files, ...publicFiles])].map((f) => (f === './' ? f : `./${f}`))
      const version = createHash('sha256').update(urls.join('|')).digest('hex').slice(0, 12)
      const source = `/* TrailStrong 2026 — service worker généré au build */
const CACHE = 'trailstrong-${version}';
const PRECACHE = ${JSON.stringify(urls)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('trailstrong-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Backups Gist (api.github.com) et autres origines : jamais interceptés.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Réseau d'abord (pour récupérer les nouvelles versions), cache en secours.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Assets hashés : cache d'abord.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  // Chemins relatifs : l'app fonctionne sous /web_hosting/trailstrong/ comme sous un domaine perso.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version ?? '1.0.0'}${process.env.GITHUB_SHA ? `-${process.env.GITHUB_SHA.slice(0, 7)}` : ''}`),
  },
  plugins: [react(), tailwindcss(), serviceWorker()],
  build: {
    outDir: '../trailstrong',
    emptyOutDir: true,
    target: 'es2022',
  },
})
