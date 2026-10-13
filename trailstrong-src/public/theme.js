// Anti-clickjacking : l'app refuse d'être affichée dans le cadre d'un autre site
// (GitHub Pages ne permet pas l'en-tête frame-ancestors).
if (window.top !== window.self) {
  document.documentElement.style.display = 'none'
  try {
    window.top.location = window.self.location.href
  } catch (e) {}
}
// Thème appliqué avant le premier rendu (sombre par défaut) — évite le flash blanc.
try {
  var a = localStorage.getItem('trailstrong:account')
  var t = localStorage.getItem(a ? 'ts:' + a + ':trailstrong:theme' : 'trailstrong:theme') === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  if (t === 'light') document.querySelector('meta[name=theme-color]').setAttribute('content', '#86c5f7')
} catch (e) {}
