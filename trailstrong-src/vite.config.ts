import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Génère sw.js après l'écriture du build, à partir de TOUS les fichiers produits
 * (index.html, JS/CSS hashés, polices, icônes, photos, catalogue) :
 * - précache complet pour un usage 100 % hors-ligne au sous-sol du gym ;
 * - chaque fichier porte une révision (empreinte de son contenu) : une mise à jour
 *   ne retélécharge que les fichiers modifiés, pas les 3-4 Mo du cache ;
 * - l'app s'ouvre depuis le cache, tout de suite, même avec un réseau qui traîne ;
 *   la nouvelle version s'installe en arrière-plan (bandeau « Mettre à jour »).
 */
function serviceWorker(): Plugin {
  let outDir = ''
  return {
    name: 'trailstrong-sw',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir.startsWith('/') ? c.build.outDir : join(c.root, c.build.outDir)
    },
    writeBundle() {
      const walk = (dir: string, rel = ''): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(join(dir, e.name), `${rel}${e.name}/`) : [`${rel}${e.name}`],
        )
      const files = walk(outDir).filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
      const rev = (f: string) => createHash('sha256').update(readFileSync(join(outDir, f))).digest('hex').slice(0, 10)
      const assets: Record<string, string> = { './': rev('index.html') }
      for (const f of files) if (f !== 'index.html') assets[`./${f}`] = rev(f)
      const source = `/* TrailStrong 2026 — service worker généré au build */
const CACHE = 'trailstrong-files';
const ASSETS = ${JSON.stringify(assets)};
const SCOPE = new URL(self.registration.scope);
// Clé de cache = URL + révision du contenu : un fichier inchangé n'est jamais retéléchargé.
const keyOf = (u) => new URL(u + '?rev=' + ASSETS[u], SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(Object.keys(ASSETS).map(async (u) => {
      if (await cache.match(keyOf(u))) return;
      const res = await fetch(new URL(u, SCOPE), { cache: 'no-cache' });
      if (res.ok) await cache.put(keyOf(u), res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Anciens caches (une version = un cache) et fichiers qui ne font plus partie de l'app.
    for (const k of await caches.keys()) if (k.startsWith('trailstrong-') && k !== CACHE) await caches.delete(k);
    const cache = await caches.open(CACHE);
    const keep = new Set(Object.keys(ASSETS).map(keyOf));
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Backups Gist (api.github.com), photos du catalogue et autres origines : jamais interceptés.
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const rel = req.mode === 'navigate' ? './' : './' + decodeURIComponent(url.pathname.slice(SCOPE.pathname.length));
  if (!ASSETS[rel]) return;
  // Cache d'abord (ouverture instantanée), réseau si le fichier manque.
  event.respondWith(caches.open(CACHE).then((c) => c.match(keyOf(rel))).then((hit) => hit || fetch(req)));
});
`
      writeFileSync(join(outDir, 'sw.js'), source)
    },
  }
}

/**
 * Content-Security-Policy injectée au build uniquement (le serveur de dev de
 * Vite a besoin de scripts inline). N'autorise que : le site lui-même, Google
 * Identity Services (+ clés publiques Google), l'API GitHub (backup Gist),
 * les photos du catalogue (raw.githubusercontent.com), Firebase (Auth + Firestore
 * + App Check / reCAPTCHA). Les polices sont embarquées.
 */
function csp(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "font-src 'self'",
    "img-src 'self' data: https://*.googleusercontent.com https://raw.githubusercontent.com",
    "connect-src 'self' https://accounts.google.com/gsi/ https://www.googleapis.com/oauth2/v3/certs https://api.github.com https://gist.githubusercontent.com https://raw.githubusercontent.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com/recaptcha/",
    'frame-src https://accounts.google.com/gsi/ https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'trailstrong-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
    },
  }
}

/**
 * Aperçu de PR (TS_PREVIEW = n° de PR) : publié sur le même domaine que le vrai
 * site, il ne doit jamais toucher ses données. Un script chargé avant tout le
 * reste range localStorage / sessionStorage sous le préfixe « preview: »,
 * affiche un bandeau, et le service worker n'est pas enregistré (il effacerait
 * les caches du vrai site).
 */
const PREVIEW = process.env.TS_PREVIEW ?? ''
function preview(): Plugin {
  const source = `(function () {
  var P = 'preview:'
  function wrap(real) {
    function keys() {
      var out = []
      for (var i = 0; i < real.length; i++) {
        var k = real.key(i)
        if (k && k.indexOf(P) === 0) out.push(k.slice(P.length))
      }
      return out
    }
    var api = {
      getItem: function (k) { return real.getItem(P + k) },
      setItem: function (k, v) { real.setItem(P + k, String(v)) },
      removeItem: function (k) { real.removeItem(P + k) },
      clear: function () { keys().forEach(function (k) { real.removeItem(P + k) }) },
      key: function (i) { var k = keys()[i]; return k === undefined ? null : k },
    }
    return new Proxy(api, {
      get: function (t, k) {
        if (k === 'length') return keys().length
        if (k in t) return t[k]
        return typeof k === 'string' ? real.getItem(P + k) : undefined
      },
      ownKeys: function () { return keys() },
      getOwnPropertyDescriptor: function (t, k) {
        var v = real.getItem(P + String(k))
        return v === null ? undefined : { enumerable: true, configurable: true, value: v }
      },
    })
  }
  try {
    var ls = wrap(window.localStorage)
    var ss = wrap(window.sessionStorage)
    Object.defineProperty(window, 'localStorage', { value: ls, configurable: true })
    Object.defineProperty(window, 'sessionStorage', { value: ss, configurable: true })
    window.__tsPreviewOk = window.localStorage === ls && window.sessionStorage === ss
  } catch (e) {
    window.__tsPreviewOk = false
  }
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div')
    b.textContent = 'Aperçu PR #${PREVIEW} · données de test séparées'
    b.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);top:0;z-index:2147483647;background:#ec7a32;color:#2a1d3d;font:700 10px/1.6 system-ui,sans-serif;white-space:nowrap;padding:1px 10px;border-radius:0 0 8px 8px;pointer-events:none')
    document.body.appendChild(b)
  })
})()
`
  return {
    name: 'trailstrong-preview',
    apply: 'build',
    transformIndexHtml(html) {
      return PREVIEW ? html.replace('<script src="./theme.js"></script>', '<script src="./preview-ns.js"></script>\n    <script src="./theme.js"></script>') : html
    },
    generateBundle() {
      if (PREVIEW) this.emitFile({ type: 'asset', fileName: 'preview-ns.js', source })
    },
  }
}

export default defineConfig({
  // Chemins relatifs : l'app fonctionne sous /web_hosting/trailstrong/ comme sous un domaine perso.
  base: './',
  define: {
    // Empreintes SHA-256 des emails Google autorisés (l'email n'est pas publié en clair).
    __ALLOWED_EMAIL_HASHES__: JSON.stringify(
      (process.env.ALLOWED_GOOGLE_EMAIL ?? process.env.VITE_ALLOWED_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .map((e) => createHash('sha256').update(e).digest('hex')),
    ),
    __PREVIEW__: JSON.stringify(PREVIEW),
    __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version ?? '1.0.0'}${process.env.GITHUB_SHA ? `-${process.env.GITHUB_SHA.slice(0, 7)}` : ''}`),
  },
  plugins: [react(), tailwindcss(), serviceWorker(), csp(), preview()],
  build: {
    outDir: '../trailstrong',
    emptyOutDir: true,
    target: 'es2022',
  },
})
