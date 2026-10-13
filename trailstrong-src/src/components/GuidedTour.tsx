/**
 * Visite guidée de l'app (premier lancement, ou Menu → Visite guidée) :
 * un projecteur sur chaque élément clé + une bulle d'explication, pas à pas.
 * Les éléments sont repérés par l'attribut `data-tour`.
 */
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Step {
  target?: string
  title: string
  text: string
}

const STEPS: Step[] = [
  { title: 'Bienvenue sur TrailStrong', text: 'Petit tour d’une minute pour découvrir l’app. Tu peux le passer et le revoir quand tu veux depuis le Menu.' },
  { target: 'tabs', title: 'Tes séances', text: 'Choisis la séance du jour ici. « Tout » montre tout le programme, « Stats » ta progression semaine après semaine.' },
  { target: 'finish', title: 'Terminer la séance', text: 'À la fin, touche ce bouton : bilan, ressenti, et conseils de récup (protéines, eau, course).' },
  { target: 'warmup', title: '1 · Activation', text: 'Commence toujours par l’échauffement : quelques minutes pour réveiller chevilles, genoux et fessiers.' },
  { target: 'exercise', title: 'Un exercice', text: 'Touche la carte pour voir le schéma, les photos et les consignes. Le bouton « Coach » te guide au son : 3-2-1, tempo de chaque rep, stop, repos.' },
  { target: 'validate', title: 'Valider une série', text: 'Après chaque série, valide : le chrono de repos démarre tout seul. Sur les exercices une jambe, l’app te dit quand changer de côté.' },
  { target: 'timer', title: 'Chrono de repos', text: 'Il bipe à la fin du repos. 60 s, 90 s ou +30 s pour l’ajuster, ▶ pour le lancer à la main.' },
  {
    target: 'add',
    title: 'Ajouter un exercice',
    text: 'Tu veux varier ? « Bibliothèque » : des fiches complètes comme ton programme. « Catalogue » : 800 exercices en fiche simplifiée (photos, schéma approchant). Touche une carte puis « Retirer » pour en enlever un.',
  },
  { target: 'mobility', title: '3 · Mobilité', text: 'Pour finir, le retour au calme guidé : des étirements choisis pour la séance, enchaînés par le coach.' },
  { target: 'menu', title: 'Le Menu', text: 'Ton profil, le son du coach, le thème clair ou sombre, refaire ton programme… et revoir cette visite.' },
  {
    title: 'C’est parti !',
    text: 'Ton programme est généré automatiquement à partir de tes réponses : c’est un repère, pas un avis médical. Le mieux est de le faire valider par un physio ou un coach, surtout en cas de douleur ou de blessure.',
  },
]

/** Premier élément visible portant `data-tour="name"` (dock mobile ou onglets desktop). */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const steps = STEPS.filter((s) => !s.target || findTarget(s.target))
  const step = steps[Math.min(i, steps.length - 1)]

  const measure = useCallback(() => {
    const el = step.target ? findTarget(step.target) : null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useLayoutEffect(() => {
    const el = step.target ? findTarget(step.target) : null
    // L'en-tête n'est pas fixe : on remonte en haut pour le montrer en entier.
    if (el?.closest('header')) window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (el && getComputedStyle(el).position !== 'fixed' && !el.closest('nav, [data-fixed]')) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    measure()
    const t = window.setTimeout(measure, 450)
    return () => window.clearTimeout(t)
  }, [step, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('keydown', onKey)
    }
  }, [measure, onClose, steps.length])

  const last = i >= steps.length - 1
  const pad = 6
  const vh = window.innerHeight
  const below = rect ? rect.top + rect.height / 2 < vh / 2 : false
  const bubbleStyle: React.CSSProperties = rect
    ? below
      ? { top: Math.min(rect.bottom + pad + 12, vh - 220) }
      : { bottom: Math.min(vh - rect.top + pad + 12, vh - 220) }
    : { top: '50%', transform: 'translateY(-50%)' }

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`Visite guidée : ${step.title}`} data-noswipe>
      {/* Projecteur : tout l'écran assombri sauf l'élément présenté. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-[3px] border-sun transition-all duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(13, 10, 23, 0.74)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(13,10,23,0.74)]" />
      )}
      {/* Bloque les clics sur l'app pendant la visite. */}
      <div className="fixed inset-0" onClick={() => setI((x) => Math.min(x + 1, steps.length - 1))} />

      <div className="fixed inset-x-0 mx-auto w-[calc(100%-32px)] max-w-sm" style={bubbleStyle}>
        <div className="b-card fade-up p-4" key={i}>
          <div className="flex items-start gap-2">
            <p className="tag h-6 -rotate-2 bg-sun px-2 text-[10px]">
              {i + 1}/{steps.length}
            </p>
            <button type="button" onClick={onClose} aria-label="Passer la visite" className="ml-auto grid h-8 w-8 place-items-center rounded-full border-2 border-ink">
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
          <h2 className="headline mt-2 text-[22px]">{step.title}</h2>
          <p className="mt-1.5 text-[14px] font-semibold leading-snug">{step.text}</p>
          <div className="mt-4 flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="b-btn flex h-11 items-center gap-1 px-3 text-[13px] uppercase tracking-wide">
                <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setI(i + 1))}
              className={`b-btn flex h-11 flex-1 items-center justify-center gap-1.5 text-[13px] uppercase tracking-wide ${last ? 'bg-mint' : 'bg-flame'}`}
            >
              {last ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={3} /> Compris !
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
