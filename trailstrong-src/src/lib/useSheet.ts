/**
 * Comportement « tiroir iOS » partagé : fermeture animée (le tiroir redescend,
 * le fond s'efface) et glisser vers le bas pour fermer quand le contenu est en
 * haut de sa zone de défilement. Respecte « réduire les animations ».
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from './haptics'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const CLOSE_MS = 230

export function useSheet<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const [closing, setClosing] = useState(false)
  const ref = useRef<T | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const done = useRef(false)

  const close = useCallback(() => {
    if (done.current) return
    done.current = true
    if (reduced()) return closeRef.current()
    setClosing(true)
    window.setTimeout(() => closeRef.current(), CLOSE_MS)
  }, [])

  // Glisser vers le bas pour fermer (écrans tactiles, tiroir en bas d'écran).
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(min-width: 768px)').matches) return
    let y0 = 0
    let t0 = 0
    let dy = 0
    let active = false
    const scrollerAtTop = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n.scrollTop <= 0
      }
      return el.scrollTop <= 0
    }
    const start = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      if (e.touches.length !== 1 || t.closest('input, textarea, select, [data-nodrag]') || !scrollerAtTop(t)) return
      y0 = e.touches[0].clientY
      t0 = performance.now()
      dy = 0
      active = true
    }
    const move = (e: TouchEvent) => {
      if (!active) return
      dy = e.touches[0].clientY - y0
      if (dy <= 0) {
        el.style.transform = ''
        el.classList.remove('dragging')
        return
      }
      e.preventDefault()
      el.classList.add('dragging')
      // Résistance progressive, comme un élastique.
      el.style.transform = `translateY(${dy < 120 ? dy : 120 + (dy - 120) * 0.6}px)`
    }
    const end = () => {
      if (!active) return
      active = false
      const v = dy / Math.max(1, performance.now() - t0)
      el.classList.remove('dragging')
      if (dy > 110 || (dy > 30 && v > 0.6)) {
        el.style.setProperty('--drag-y', `${dy}px`)
        el.style.transform = ''
        haptic(8)
        close()
      } else if (dy > 0) {
        el.classList.add('settling')
        el.style.transform = ''
        window.setTimeout(() => el.classList.remove('settling'), 360)
      }
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [close])

  return {
    close,
    closing,
    ref,
    backdrop: closing ? 'fade-out sheet-backdrop' : 'fade-in sheet-backdrop',
    panel: closing ? 'sheet closing' : 'sheet',
  }
}
