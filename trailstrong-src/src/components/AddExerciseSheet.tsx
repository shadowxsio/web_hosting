import { ArrowLeft, BookOpen, ImageOff, Loader2, PenLine, Plus, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '../data/program'
import { aiAdapt, aiCreate, aiReady, withPhotos } from '../lib/ai'
import { draftFromCatalog, equipFr, guessDiagram, imgUrl, loadCatalog, musclesFr, searchCatalog, type CatalogEntry } from '../lib/catalog'
import { addCustom, parseProtocol, parseRest, type CustomDraft } from '../lib/custom'
import { touch } from '../lib/storage'
import { FIGURES, type AnimationId } from './diagram-base'
import { ExerciseDiagram } from './ExerciseDiagram'

type Tab = 'ai' | 'catalog' | 'manual'
const PRESETS = ['Ischios', 'Fessiers', 'Cheville', 'Genou', 'Tronc']
const CHIPS = ['Mollets', 'Fessiers', 'Ischios', 'Quadriceps', 'Adducteurs', 'Gainage', 'Sauts', 'Étirements']
const AI_EXAMPLES = ['Un exo pour les adducteurs sans machine', 'Renforcer les chevilles pour les descentes', 'Une variante de squat une jambe', 'Gainage anti-rotation pour le trail']

/** Tiroir d'ajout : IA (description libre), catalogue (~800 exos) ou saisie manuelle. */
export function AddExerciseSheet({ session, onClose, onAdded }: { session: Session; onClose: () => void; onAdded: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>(aiReady() ? 'ai' : 'catalog')
  const [draft, setDraft] = useState<CustomDraft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  /** Brouillon prêt : on l'affiche tout de suite, les photos arrivent ensuite. */
  const show = (d: CustomDraft) => {
    setDraft(d)
    if (d.catalogId && !d.photos) void withPhotos(d).then((p) => p.photos && setDraft((cur) => (cur && cur.catalogId === d.catalogId ? { ...cur, photos: p.photos } : cur)))
  }

  const save = (d: CustomDraft) => {
    const id = addCustom(session.id, d)
    touch()
    navigator.vibrate?.([15, 30, 15])
    onAdded(id)
  }

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="sheet pb-safe flex max-h-[94dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Ajouter un exercice"
        data-noswipe
      >
        <header className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="tag h-6 -rotate-1 bg-sun px-2 text-[10px]">Nouvel exercice · {session.short}</p>
              <h2 className="headline mt-2 text-[26px] [text-shadow:2px_2px_0_#f0773a]">{draft ? 'Vérifie & ajoute' : 'Ajouter un exercice'}</h2>
            </div>
            <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
              <X className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
          {!draft && (
            <div className="mt-4 grid grid-cols-3 gap-1.5" role="tablist">
              {(
                [
                  ['ai', 'IA', Sparkles],
                  ['catalog', 'Catalogue', BookOpen],
                  ['manual', 'Manuel', PenLine],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id)
                    setError('')
                  }}
                  className={`b-btn flex h-11 items-center justify-center gap-1.5 text-[13px] uppercase italic ${tab === id ? 'b-btn-ink' : ''}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} /> {label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {error && (
            <p className="mb-3 border-2 border-ink bg-rose px-3 py-2 text-[13px] font-bold" role="alert">
              {error}
            </p>
          )}
          {draft ? (
            <Preview
              draft={draft}
              setDraft={setDraft}
              busy={busy}
              onBack={() => setDraft(null)}
              onAdapt={
                draft.source === 'catalog' && aiReady()
                  ? () =>
                      run('L’IA traduit et adapte…', async () => {
                        const entry = (await loadCatalog()).find((e) => e.id === draft.catalogId)
                        if (entry) setDraft({ ...(await aiAdapt(entry)), photos: draft.photos })
                      })
                  : undefined
              }
              onSave={() => save(draft)}
            />
          ) : tab === 'ai' ? (
            <AiTab busy={busy} onAsk={(q) => run('L’IA prépare ta fiche…', async () => show(await aiCreate(q)))} />
          ) : tab === 'catalog' ? (
            <CatalogTab onPick={(e) => show(draftFromCatalog(e))} />
          ) : (
            <ManualTab onSave={save} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── IA ───────────────────────────────────────────────────────────────────
function AiTab({ busy, onAsk }: { busy: string | null; onAsk: (q: string) => void }) {
  const [q, setQ] = useState('')
  if (!aiReady())
    return (
      <div className="b-card p-4">
        <p className="flex items-center gap-2 text-[15px] font-black uppercase italic">
          <Sparkles className="h-4 w-4 text-flame" /> Assistant IA
        </p>
        <p className="mt-2 text-[13px] font-semibold leading-snug text-ink/80">
          Décris l’exercice que tu veux, l’IA choisit le mouvement, les séries, le tempo du coach, les consignes en français, les photos et le schéma.
        </p>
        <p className="mt-3 border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-bold leading-snug">
          À activer une fois : Menu → déverrouille les réglages (PIN) → « Assistant IA (Gemini) » → colle ta clé (aistudio.google.com → Get API key).
        </p>
      </div>
    )
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim().length > 2 && !busy) onAsk(q.trim())
      }}
    >
      <p className="label mb-1">Décris l’exercice voulu</p>
      <textarea
        id="ai-request"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="ex. un exo pour renforcer les adducteurs sans machine, unilatéral"
        className="b-input w-full resize-none px-3 py-2.5 text-[14px] leading-snug placeholder:text-ink/40"
      />
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {AI_EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setQ(ex)} className="b-btn h-9 shrink-0 px-3 text-[12px]">
            {ex}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={!!busy || q.trim().length < 3}
        className="b-btn mt-4 flex h-12 w-full items-center justify-center gap-2 bg-flame text-[14px] uppercase italic disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={2.5} />}
        {busy ?? 'Créer la fiche'}
      </button>
      <p className="mt-2 text-[11px] font-semibold text-ink/60">Tu pourras tout vérifier et modifier avant l’ajout.</p>
    </form>
  )
}

// ── Catalogue ────────────────────────────────────────────────────────────
function CatalogTab({ onPick }: { onPick: (e: CatalogEntry) => void }) {
  const [list, setList] = useState<CatalogEntry[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    loadCatalog().then(setList, (e: Error) => setErr(e.message))
    input.current?.focus()
  }, [])
  const results = useMemo(() => (list ? searchCatalog(list, q) : []), [list, q])

  return (
    <div>
      <label className="b-input flex h-12 items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-ink/60" strokeWidth={2.5} />
        <input
          ref={input}
          id="catalog-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="fente, mollets, adducteurs, step up…"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-ink/40 focus:outline-none"
        />
      </label>
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {CHIPS.map((c) => (
          <button key={c} type="button" onClick={() => setQ(c)} className={`b-btn h-9 shrink-0 px-3 text-[12px] ${q === c ? 'b-btn-ink' : ''}`}>
            {c}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-[13px] font-bold text-danger">{err}</p>}
      {!list && !err && <p className="mt-4 text-[13px] font-bold text-ink/60">Chargement du catalogue…</p>}
      {list && !q && <p className="mt-3 text-[12px] font-semibold text-ink/65">{list.length} exercices (base libre de droits, noms en anglais). Cherche en français ou en anglais.</p>}
      {list && q && !results.length && <p className="mt-4 text-[13px] font-bold text-ink/60">Aucun résultat. Essaie un autre mot ou l’onglet IA.</p>}
      <ul className="mt-3 space-y-2">
        {results.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e)} className="b-card flex w-full items-center gap-3 p-2 text-left !shadow-[3px_3px_0_var(--color-shadow)] active:translate-y-px">
              <Thumb src={imgUrl(e.img[0])} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-black">{e.n}</span>
                <span className="block truncate text-[12px] font-semibold text-ink/65">
                  {musclesFr(e).join(', ')} · {equipFr(e)}
                </span>
              </span>
              <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Thumb({ src }: { src: string }) {
  const [ok, setOk] = useState(true)
  return ok ? (
    <img src={src} alt="" loading="lazy" onError={() => setOk(false)} className="h-14 w-14 shrink-0 border-2 border-ink object-cover" />
  ) : (
    <span className="grid h-14 w-14 shrink-0 place-items-center border-2 border-ink">
      <ImageOff className="h-4 w-4 text-ink/50" />
    </span>
  )
}

// ── Manuel ───────────────────────────────────────────────────────────────
function ManualTab({ onSave }: { onSave: (d: CustomDraft) => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [protocol, setProtocol] = useState('')
  const [rest, setRest] = useState('')
  const [weight, setWeight] = useState('')
  const [tip, setTip] = useState('')
  const [diagram, setDiagram] = useState<AnimationId | null>(null)
  const [touched, setTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const valid = name.trim().length > 0
  const p = parseProtocol(protocol)
  const restS = parseRest(rest)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!valid) return nameRef.current?.focus()
        onSave({
          source: 'manual',
          name: name.trim(),
          target: target.trim() || undefined,
          protocol: protocol.trim() || undefined,
          rest: rest.trim() || undefined,
          startWeight: weight.trim() || undefined,
          tip: tip.trim() || undefined,
          diagram: diagram ?? guessDiagram(name),
        })
      }}
    >
      <Field label="Nom de l’exercice *" error={touched && !valid ? 'Le nom est obligatoire.' : undefined}>
        <input ref={nameRef} id="custom-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Fentes marchées lestées" maxLength={80} className={input} />
      </Field>

      <Field label="Groupe cible / badge">
        <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {PRESETS.map((t) => (
            <button key={t} type="button" onClick={() => setTarget((cur) => (cur === t ? '' : t))} className={`b-btn h-10 shrink-0 px-3 text-[13px] ${target === t ? 'b-btn-ink' : ''}`}>
              {t}
            </button>
          ))}
        </div>
        <input id="custom-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ou texte libre (ex. Adducteurs)" maxLength={30} className={input} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Séries & répétitions" hint={protocol ? `→ ${p.sets} séries · ${p.reps}` : undefined}>
          <input id="custom-protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="3 × 10 reps" maxLength={30} className={input} />
        </Field>
        <Field label="Repos conseillé" hint={rest ? `→ ${restS} s` : undefined}>
          <input id="custom-rest" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="60s" maxLength={10} className={input} />
        </Field>
      </div>

      <Field label="Poids de départ · lbs">
        <input id="custom-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="ex. 25" className={`${input} font-mono`} />
      </Field>

      <Field label="Astuce / consigne">
        <textarea
          id="custom-tip"
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          placeholder="ex. Genou avant dans l’axe du 2e orteil, buste gainé…"
          rows={3}
          maxLength={400}
          className={`${input} h-auto resize-none py-2.5 leading-snug`}
        />
      </Field>

      <Field label="Schéma" hint={diagram ? undefined : 'auto d’après le nom'}>
        <DiagramPicker value={diagram ?? guessDiagram(name)} onChange={setDiagram} />
      </Field>

      <button type="submit" className="b-btn mt-4 flex h-12 w-full items-center justify-center gap-1.5 bg-flame text-[14px] uppercase italic">
        <Plus className="h-4 w-4" strokeWidth={2.5} /> Ajouter l’exercice
      </button>
    </form>
  )
}

// ── Aperçu / édition du brouillon ────────────────────────────────────────
function Preview({
  draft: d,
  setDraft,
  busy,
  onBack,
  onAdapt,
  onSave,
}: {
  draft: CustomDraft
  setDraft: (d: CustomDraft) => void
  busy: string | null
  onBack: () => void
  onAdapt?: () => void
  onSave: () => void
}) {
  const timed = d.mode === 'timed'
  const set = (p: Partial<CustomDraft>, proto = false) => {
    const next = { ...d, ...p }
    // Protocole modifié à la main : on régénère le texte affiché.
    if (proto) {
      const t = next.mode === 'timed'
      next.reps = `${next.defaultReps ?? ''}${t ? ' s' : ' reps'}${next.perSide ? (t ? ' / côté' : ' / jambe') : ''}`
      if (t) next.cadence = undefined
    }
    setDraft(next)
  }

  return (
    <div>
      <section className="hero overflow-hidden border-[2.5px] border-ink shadow-[4px_4px_0_var(--color-shadow)]">
        <div className="mx-auto aspect-[5/4] w-full max-w-[300px]">
          <ExerciseDiagram id={d.diagram ?? 'squat'} />
        </div>
      </section>
      <p className="label mb-1 mt-3">Schéma · touche pour changer</p>
      <DiagramPicker value={d.diagram ?? 'squat'} onChange={(diagram) => set({ diagram })} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {d.photos ? (
          d.photos.map((src, i) => <img key={i} src={src} alt={`Position ${i + 1}`} className="aspect-[4/3] w-full border-2 border-ink object-cover" />)
        ) : d.catalogId ? (
          <p className="col-span-2 flex items-center gap-2 border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-bold text-ink/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Téléchargement des photos…
          </p>
        ) : null}
      </div>

      <Field label="Nom">
        <input id="draft-name" value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} className={`${input} mt-1`} />
      </Field>
      <p className="-mt-1 mb-3 text-[12px] font-semibold text-ink/70">
        {d.target} {d.equipment && `· ${d.equipment}`}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Séries">
          <input inputMode="numeric" value={d.sets ?? ''} onChange={(e) => set({ sets: Math.min(10, Number(e.target.value.replace(/\D/g, '')) || 1) }, true)} className={`${input} text-center font-mono`} />
        </Field>
        <Field label={timed ? 'Secondes' : 'Reps'}>
          <input inputMode="numeric" value={d.defaultReps ?? ''} onChange={(e) => set({ defaultReps: Number(e.target.value.replace(/\D/g, '')) || undefined }, true)} className={`${input} text-center font-mono`} />
        </Field>
        <Field label="Repos · s">
          <input inputMode="numeric" value={d.restS ?? ''} onChange={(e) => set({ restS: Number(e.target.value.replace(/\D/g, '')) || 0 })} className={`${input} text-center font-mono`} />
        </Field>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => set({ perSide: !d.perSide }, true)} className={`b-btn h-11 text-[13px] uppercase italic ${d.perSide ? 'b-btn-ink' : ''}`}>
          {d.perSide ? '✓ Unilatéral G/D' : 'Bilatéral'}
        </button>
        <button type="button" onClick={() => set({ mode: timed ? 'strength' : 'timed' }, true)} className={`b-btn h-11 text-[13px] uppercase italic ${timed ? 'b-btn-ink' : ''}`}>
          {timed ? '⏱ Maintien chrono' : '🏋️ Répétitions'}
        </button>
      </div>
      <p className="mb-3 border-2 border-ink bg-paper px-3 py-2 text-[13px] font-bold leading-snug">
        {d.sets} × {d.reps} · repos {d.restS ?? 0} s
        {d.cadence?.length ? <span className="block text-[12px] text-ink/70">Tempo coach : {d.cadence.map((p) => `${p.label} ${p.s} s`).join(' → ')}</span> : null}
      </p>

      {d.tip && <p className="mb-2 text-[13px] leading-snug"><b>Consigne :</b> {d.tip}</p>}
      {d.kneeAnkle && <p className="mb-2 text-[13px] leading-snug"><b>Genou / cheville :</b> {d.kneeAnkle}</p>}
      {d.steps && d.steps.length > 0 && (
        <details className="mb-3 border-2 border-ink bg-paper px-3 py-2 text-[13px]">
          <summary className="cursor-pointer font-black uppercase italic">Exécution ({d.steps.length} étapes{d.stepsLang === 'en' ? ', en anglais' : ''})</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 leading-snug">
            {d.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}

      {onAdapt && (
        <button type="button" onClick={onAdapt} disabled={!!busy} className="b-btn mb-2 flex h-12 w-full items-center justify-center gap-2 bg-lilac text-[13px] uppercase italic disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={2.5} />}
          {busy ?? 'Traduire & adapter avec l’IA'}
        </button>
      )}
      <div className="grid grid-cols-[1fr_1.6fr] gap-3">
        <button type="button" onClick={onBack} className="b-btn flex h-12 items-center justify-center gap-1.5 text-[14px] uppercase italic">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Retour
        </button>
        <button type="button" onClick={onSave} disabled={!d.name.trim() || !!busy} className="b-btn flex h-12 items-center justify-center gap-1.5 bg-flame text-[14px] uppercase italic disabled:opacity-50">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Ajouter
        </button>
      </div>
    </div>
  )
}

const DIAGRAM_IDS = Object.keys(FIGURES) as AnimationId[]

function DiagramPicker({ value, onChange }: { value: AnimationId; onChange: (id: AnimationId) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('[aria-checked="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [value])
  return (
    <div ref={ref} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Schéma">
      {DIAGRAM_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={id === value}
          aria-label={id}
          onClick={() => onChange(id)}
          className={`hero h-[72px] w-[72px] shrink-0 border-2 ${id === value ? 'border-flame shadow-[3px_3px_0_var(--color-shadow)]' : 'border-ink opacity-70'}`}
        >
          <ExerciseDiagram id={id} />
        </button>
      ))}
    </div>
  )
}

const input = 'b-input h-12 w-full px-3 text-[14px] placeholder:text-ink/40'

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <p className="label mb-1 flex justify-between">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-ocean">{hint}</span>}
      </p>
      {children}
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
