// Thème appliqué avant le premier rendu (sombre par défaut) — évite le flash blanc.
try {
  var t = localStorage.getItem('trailstrong:theme') === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  if (t === 'light') document.querySelector('meta[name=theme-color]').setAttribute('content', '#86c5f7')
} catch (e) {}
