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

/**
 * Content-Security-Policy injectée au build uniquement (le serveur de dev de
 * Vite a besoin de scripts inline). N'autorise que : le site lui-même, Google
 * Identity Services (+ clés publiques Google), l'API GitHub (backup Gist),
 * les photos du catalogue (raw.githubusercontent.com), Firebase (Auth + Firestore
 * + App Check / reCAPTCHA) et Google Fonts.
 */
function csp(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
    "font-src 'self' https://fonts.gstatic.com",
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
