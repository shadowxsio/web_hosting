import { ArrowLeft, BookOpen, Check, ImageOff, Info, Library, Loader2, PenLine, Plus, Search, X } from 'lucide-react'
import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LIBRARY_OF_CATALOG } from '../data/demos'
import { GOAL_LABEL, libraryMeta, type Goal } from '../data/generator'
import type { Exercise, Session } from '../data/program'
import { draftFromCatalog, equipFr, guessDiagram, imgUrl, loadCatalog, musclesFr, nameOf, norm, searchCatalog, withPhotos, type CatalogEntry } from '../lib/catalog'
import { addCustom, parseProtocol, parseRest, type CustomDraft } from '../lib/custom'
import { touch } from '../lib/storage'
import { LIBRARY, addToSession } from '../lib/userProgram'
import { DemoPlayer } from './DemoPlayer'
import { FIGURES, type AnimationId } from './diagram-base'
import { DIAGRAM_OF, ExerciseDiagram } from './ExerciseDiagram'
import { restLabel } from './meta'
import { haptic } from '../lib/haptics'
import { useSheet } from '../lib/useSheet'

type Tab = 'library' | 'catalog' | 'manual'
const PRESETS = ['Ischios', 'Fessiers', 'Cheville', 'Genou', 'Tronc']
const CHIPS = ['Mollets', 'Fessiers', 'Ischios', 'Quadriceps', 'Adducteurs', 'Gainage', 'Sauts', 'Étirements']

const TAB_INFO: Record<Tab, string> = {
  library: 'Fiches complètes, comme ton programme : schéma dédié, photos, consignes en français, tempo du coach et conseils genou / cheville.',
  catalog:
    'Plus de 800 exercices en fiche simplifiée : photos, schéma approchant et tempo standard, sans conseils genou / cheville. Consignes en français pour les 100 plus courants, en anglais pour les autres.',
  manual: 'Ta propre fiche : nom, séries, repos et consigne.',
}

/** Tiroir d'ajout : bibliothèque (fiches complètes), catalogue (~800 fiches simplifiées) ou saisie manuelle. */
export function AddExerciseSheet({ session, onClose: closeNow, onAdded }: { session: Session; onClose: () => void; onAdded: (id: string) => void }) {
  const sheet = useSheet(closeNow)
  const onClose = sheet.close
  const [tab, setTab] = useState<Tab>('library')
  const [draft, setDraft] = useState<CustomDraft | null>(null)
  const [pick, setPick] = useState<{ ex: Exercise; fromCatalog: boolean } | null>(null)
  const inSession = useMemo(() => new Set(session.exercises.map((e) => e.id)), [session])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Brouillon prêt : on l'affiche tout de suite, les photos arrivent ensuite. */
  const show = (d: CustomDraft) => {
    setDraft(d)
    if (d.catalogId && !d.photos) void withPhotos(d).then((p) => p.photos && setDraft((cur) => (cur && cur.catalogId === d.catalogId ? { ...cur, photos: p.photos } : cur)))
  }

  const done = (id: string) => {
    touch()
    haptic([15, 30, 15])
    onAdded(id)
  }
  const save = (d: CustomDraft) => done(addCustom(session.id, d))
  const addLibrary = (ex: Exercise) => {
    addToSession(session.id, ex.id)
    done(ex.id)
  }

  const detail = draft ?? pick
  return createPortal(
    <div className={`${sheet.backdrop} fixed inset-0 z-50 flex items-end justify-center`} onClick={onClose}>
      <div
        ref={sheet.ref} className={`${sheet.panel} pb-safe flex max-h-[94dvh] w-full max-w-xl flex-col border-[2.5px] border-b-0 border-ink bg-paper-2 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Ajouter un exercice"
        data-noswipe
      >
        <header className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="tag h-6 -rotate-1 bg-sun px-2 text-[10px]">Nouvel exercice · {session.short}</p>
              <h2 className="headline mt-2 text-[26px]">{detail ? 'Vérifie & ajoute' : 'Ajouter un exercice'}</h2>
            </div>
            <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
              <X className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
          {!detail && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-1.5" role="tablist">
                {(
                  [
                    ['library', 'Biblio', Library],
                    ['catalog', 'Catalogue', BookOpen],
                    ['manual', 'Manuel', PenLine],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`b-btn flex h-11 items-center justify-center gap-1.5 text-[13px] uppercase tracking-wide ${tab === id ? 'b-btn-ink' : ''}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} /> {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 flex gap-2 rounded-xl border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-semibold leading-snug text-ink/80">
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                {TAB_INFO[tab]}
              </p>
            </>
          )}
        </header>

        {/* key : chaque écran repart en haut de la liste. */}
        <div key={draft ? 'draft' : pick ? pick.ex.id : tab} className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {draft ? (
            <Preview draft={draft} setDraft={setDraft} onBack={() => setDraft(null)} onSave={() => save(draft)} />
          ) : pick ? (
            <LibraryPreview ex={pick.ex} fromCatalog={pick.fromCatalog} added={inSession.has(pick.ex.id)} onBack={() => setPick(null)} onAdd={() => addLibrary(pick.ex)} />
          ) : tab === 'library' ? (
            <LibraryTab session={session} inSession={inSession} onPick={(ex) => setPick({ ex, fromCatalog: false })} />
          ) : tab === 'catalog' ? (
            <CatalogTab
              onPick={(e) => {
                const lib = LIBRARY[LIBRARY_OF_CATALOG[e.id]]
                if (lib) setPick({ ex: lib, fromCatalog: true })
                else show(draftFromCatalog(e))
              }}
            />
          ) : (
            <ManualTab onSave={save} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Bibliothèque (fiches complètes) ──────────────────────────────────────
type Filter = Goal | 'warmup'
const FILTERS: Filter[] = ['warmup', 'knee', 'ankle', 'glutes', 'hamstrings', 'calves', 'core', 'upper', 'power']
const FILTER_LABEL = (f: Filter) => (f === 'warmup' ? '🔥 Échauffement' : GOAL_LABEL[f])
const diagramOf = (ex: Exercise): AnimationId => ex.diagram ?? DIAGRAM_OF[ex.id] ?? 'squat'

function LibraryTab({ session, inSession, onPick }: { session: Session; inSession: Set<string>; onPick: (ex: Exercise) => void }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter | null>(session.id === 'activation' ? 'warmup' : null)
  const list = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean)
    return Object.values(LIBRARY)
      .filter((ex) => {
        const m = libraryMeta(ex.id)
        if (filter === 'warmup' ? !m?.warmup : filter && !m?.goals.includes(filter)) return false
        const text = norm(`${ex.name} ${ex.target} ${ex.equipment}`)
        return words.every((w) => text.includes(w))
      })
      .sort((a, b) => Number(inSession.has(a.id)) - Number(inSession.has(b.id)) || a.name.localeCompare(b.name, 'fr'))
  }, [q, filter, inSession])
  // Ouverture rapide : 10 lignes tout de suite, le reste juste après (sans bloquer l'animation).
  const [limit, setLimit] = useState(10)
  useEffect(() => {
    const id = window.setTimeout(() => startTransition(() => setLimit(Infinity)), 260)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div>
      <label className="b-input flex h-12 items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-ink/60" strokeWidth={2.5} />
        <input
          id="library-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="pont, fente, gainage, haltères…"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-ink/40 focus:outline-none"
        />
      </label>
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter((cur) => (cur === f ? null : f))} className={`b-btn h-9 shrink-0 px-3 text-[12px] ${filter === f ? 'b-btn-ink' : ''}`}>
            {FILTER_LABEL(f)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] font-semibold text-ink/65">
        {list.length} exercice{list.length > 1 ? 's' : ''} {filter ? `· ${FILTER_LABEL(filter).replace(/^\S+\s/, '')}` : 'à fiche complète'}
      </p>
      <ul className="mt-2 space-y-2">
        {list.slice(0, limit).map((ex) => {
          const added = inSession.has(ex.id)
          return (
            <li key={ex.id} className="cv-row">
              <button
                type="button"
                onClick={() => onPick(ex)}
                className={`b-card flex w-full items-center gap-3 p-2 text-left !shadow-[0_3px_0_var(--color-shadow)] active:translate-y-px ${added ? 'opacity-60' : ''}`}
                aria-label={`Voir ${ex.name}`}
              >
                <span className="diagram-bg h-14 w-14 shrink-0 rounded-xl border-2 border-ink">
                  <ExerciseDiagram id={diagramOf(ex)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-black">{ex.name}</span>
                  <span className="block truncate text-[12px] font-semibold text-ink/65">
                    {ex.target} · {ex.equipment}
                  </span>
                </span>
                {added ? <span className="tag h-6 shrink-0 bg-mint px-1.5 text-[10px]">✓ Séance</span> : <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />}
              </button>
            </li>
          )
        })}
      </ul>
      {!list.length && <p className="mt-4 text-[13px] font-bold text-ink/60">Aucun exercice. Essaie un autre mot ou l’onglet Catalogue.</p>}
    </div>
  )
}

function LibraryPreview({ ex, fromCatalog, added, onBack, onAdd }: { ex: Exercise; fromCatalog: boolean; added: boolean; onBack: () => void; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      {fromCatalog && (
        <p className="flex gap-2 rounded-xl border-2 border-ink bg-mint px-3 py-2 text-[12px] font-bold leading-snug">
          <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} /> Cet exercice existe en fiche complète : c’est elle qui sera ajoutée.
        </p>
      )}
      <div>
        <h3 className="headline text-[22px]">{ex.name}</h3>
        <p className="mt-0.5 text-[12px] font-semibold text-ink/70">
          {ex.target} · {ex.equipment}
        </p>
      </div>
      <section className="diagram-bg overflow-hidden rounded-xl border-[2.5px] border-ink shadow-[0_4px_0_var(--color-shadow)]">
        <div className="mx-auto aspect-[5/4] w-full max-w-[300px]">
          <ExerciseDiagram id={diagramOf(ex)} />
        </div>
      </section>
      <DemoPlayer ex={ex} />
      <p className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-[13px] font-bold leading-snug">
        {ex.sets} × {ex.reps}
        {ex.rest > 0 && ` · repos ${restLabel(ex.rest)}`}
      </p>
      {ex.cue && (
        <p className="text-[13px] leading-snug">
          <b>Consigne :</b> {ex.cue}
        </p>
      )}
      {ex.kneeAnkle && (
        <p className="text-[13px] leading-snug">
          <b>Genou / cheville :</b> {ex.kneeAnkle}
        </p>
      )}
      {ex.steps.length > 0 && (
        <details className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-[13px]">
          <summary className="cursor-pointer font-black uppercase tracking-wide">Exécution ({ex.steps.length} étapes)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 leading-snug">
            {ex.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}
      <div className="grid grid-cols-[1fr_1.6fr] gap-3 pt-1">
        <button type="button" onClick={onBack} className="b-btn flex h-12 items-center justify-center gap-1.5 text-[14px] uppercase tracking-wide">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Retour
        </button>
        <button type="button" onClick={onAdd} disabled={added} className="b-btn flex h-12 items-center justify-center gap-1.5 bg-flame text-[14px] uppercase tracking-wide disabled:opacity-50">
          {added ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} /> Déjà dans la séance
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Ajouter
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Catalogue (fiches simplifiées) ───────────────────────────────────────
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
  const translated = useMemo(() => list?.filter((e) => e.fr).length ?? 0, [list])

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
      {list && !q && (
        <p className="mt-3 text-[12px] font-semibold text-ink/65">
          {list.length} exercices (base libre de droits), dont {translated} traduits en français. Cherche en français ou en anglais.
        </p>
      )}
      {list && q && !results.length && <p className="mt-4 text-[13px] font-bold text-ink/60">Aucun résultat. Essaie un autre mot, en français ou en anglais.</p>}
      <ul className="mt-3 space-y-2">
        {results.map((e) => {
          const full = !!LIBRARY_OF_CATALOG[e.id]
          return (
            <li key={e.id} className="cv-row">
              <button type="button" onClick={() => onPick(e)} className="b-card flex w-full items-center gap-3 p-2 text-left !shadow-[0_3px_0_var(--color-shadow)] active:translate-y-px">
                <Thumb src={imgUrl(e.img[0])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-black">{full ? LIBRARY[LIBRARY_OF_CATALOG[e.id]].name : nameOf(e)}</span>
                  <span className="block truncate text-[12px] font-semibold text-ink/65">
                    {musclesFr(e).join(', ')} · {equipFr(e)}
                  </span>
                </span>
                <span className={`tag h-6 shrink-0 px-1.5 text-[10px] ${full ? 'bg-mint' : e.fr ? 'bg-sun' : 'bg-paper'}`} title={full ? 'Fiche complète' : e.fr ? 'Consignes en français' : 'Consignes en anglais'}>
                  {full ? 'Complète' : e.fr ? 'FR' : 'EN'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Thumb({ src }: { src: string }) {
  const [ok, setOk] = useState(true)
  return ok ? (
    <img src={src} alt="" loading="lazy" onError={() => setOk(false)} className="h-14 w-14 shrink-0 border-2 border-ink object-cover rounded-xl" />
  ) : (
    <span className="grid h-14 w-14 shrink-0 place-items-center border-2 border-ink rounded-xl">
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

      <button type="submit" className="b-btn mt-4 flex h-12 w-full items-center justify-center gap-1.5 bg-flame text-[14px] uppercase tracking-wide">
        <Plus className="h-4 w-4" strokeWidth={2.5} /> Ajouter l’exercice
      </button>
    </form>
  )
}

// ── Aperçu / édition du brouillon (catalogue) ────────────────────────────
function Preview({ draft: d, setDraft, onBack, onSave }: { draft: CustomDraft; setDraft: (d: CustomDraft) => void; onBack: () => void; onSave: () => void }) {
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
      <p className="mb-3 flex gap-2 rounded-xl border-2 border-ink bg-sun px-3 py-2 text-[12px] font-bold leading-snug">
        <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span>
          Fiche simplifiée : schéma approchant (touche-le pour en changer), tempo standard, pas de conseils genou / cheville
          {d.stepsLang === 'en' ? ', consignes en anglais' : ''}. Vérifie les séries et le repos.
        </span>
      </p>
      <section className="diagram-bg overflow-hidden border-[2.5px] border-ink shadow-[0_4px_0_var(--color-shadow)] rounded-xl">
        <div className="mx-auto aspect-[5/4] w-full max-w-[300px]">
          <ExerciseDiagram id={d.diagram ?? 'squat'} />
        </div>
      </section>
      <p className="label mb-1 mt-3">Schéma · touche pour changer</p>
      <DiagramPicker value={d.diagram ?? 'squat'} onChange={(diagram) => set({ diagram })} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {d.photos ? (
          d.photos.map((src, i) => <img key={i} src={src} alt={`Position ${i + 1}`} className="aspect-[4/3] w-full border-2 border-ink object-cover rounded-xl" />)
        ) : d.catalogId ? (
          <p className="col-span-2 flex items-center gap-2 border-2 border-dashed border-ink/50 px-3 py-2 text-[12px] font-bold text-ink/70 rounded-xl">
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
        <button type="button" onClick={() => set({ perSide: !d.perSide }, true)} className={`b-btn h-11 text-[13px] uppercase tracking-wide ${d.perSide ? 'b-btn-ink' : ''}`}>
          {d.perSide ? '✓ Unilatéral G/D' : 'Bilatéral'}
        </button>
        <button type="button" onClick={() => set({ mode: timed ? 'strength' : 'timed' }, true)} className={`b-btn h-11 text-[13px] uppercase tracking-wide ${timed ? 'b-btn-ink' : ''}`}>
          {timed ? '⏱ Maintien chrono' : '🏋️ Répétitions'}
        </button>
      </div>
      <p className="mb-3 border-2 border-ink bg-paper px-3 py-2 text-[13px] font-bold leading-snug rounded-xl">
        {d.sets} × {d.reps} · repos {d.restS ?? 0} s
        {d.cadence?.length ? <span className="block text-[12px] text-ink/70">Tempo coach : {d.cadence.map((p) => `${p.label} ${p.s} s`).join(' → ')}</span> : null}
      </p>

      {d.tip && <p className="mb-2 text-[13px] leading-snug"><b>Consigne :</b> {d.tip}</p>}
      {d.steps && d.steps.length > 0 && (
        <details className="mb-3 border-2 border-ink bg-paper px-3 py-2 text-[13px] rounded-xl">
          <summary className="cursor-pointer font-black uppercase tracking-wide">Exécution ({d.steps.length} étapes{d.stepsLang === 'en' ? ', en anglais' : ''})</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 leading-snug">
            {d.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}

      <div className="grid grid-cols-[1fr_1.6fr] gap-3">
        <button type="button" onClick={onBack} className="b-btn flex h-12 items-center justify-center gap-1.5 text-[14px] uppercase tracking-wide">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Retour
        </button>
        <button type="button" onClick={onSave} disabled={!d.name.trim()} className="b-btn flex h-12 items-center justify-center gap-1.5 bg-flame text-[14px] uppercase tracking-wide disabled:opacity-50">
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
          className={`diagram-bg h-[72px] w-[72px] shrink-0 border-2 ${id === value ? 'border-flame shadow-[0_3px_0_var(--color-shadow)]' : 'border-ink opacity-70'}`}
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
