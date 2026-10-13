/**
 * Retour haptique. Android : navigator.vibrate. iPhone (Safari 18+, pas de
 * vibrate) : basculer un interrupteur natif <input type="checkbox" switch>
 * déclenche une petite vibration système — astuce invisible, à appeler pendant
 * un geste de l'utilisateur (clic, toucher).
 */
let label: HTMLLabelElement | null = null

function iosTap() {
  if (!label) {
    const wrap = document.createElement('div')
    wrap.setAttribute('aria-hidden', 'true')
    wrap.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = 'ts-haptic'
    input.tabIndex = -1
    input.setAttribute('switch', '')
    label = document.createElement('label')
    label.htmlFor = 'ts-haptic'
    wrap.append(input, label)
    document.body.appendChild(wrap)
  }
  label.click()
}

/** Vibration courte (ms) ou motif ; sur iPhone, un ou plusieurs « tics » système. */
export function haptic(pattern: number | number[] = 10) {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
      return
    }
    const taps = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1
    iosTap()
    for (let i = 1; i < taps; i++) window.setTimeout(iosTap, i * 90)
  } catch {
    /* pas de retour haptique : sans conséquence */
  }
}
