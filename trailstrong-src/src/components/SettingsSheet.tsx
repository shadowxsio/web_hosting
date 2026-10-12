import { CloudUpload, Download, KeyRound, Lock, RotateCcw, Upload, X } from 'lucide-react'
import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { lock, resetLocalPin, setLocalPin, usingDefaultPin } from '../lib/auth'
import { backupNow, restoreFromGist } from '../lib/backup'
import { exportJson, importJson, today, updateGist, useData } from '../lib/storage'

export function SettingsSheet({
  onClose,
  onLock,
  onNavigate,
}: {
  onClose: () => void
  onLock: () => void
  onNavigate: (tab: 'catalogue' | 'progression') => void
}) {
  const data = useData()
  const g = data.gist
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `trailstrong-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg({ ok: true, text: 'Sauvegarde JSON téléchargée.' })
  }

  const days = Object.keys(data.logs).length

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="sheet pb-safe max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 px-4 pt-4 md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Réglages"
        data-noswipe
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="headline text-[22px] text-zinc-50">Menu</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-400 active:bg-zinc-900" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Liste de navigation façon quelleia : surtitre + titre italique gras */}
        <nav className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          {(
            [
              ['catalogue', 'Vos 4 séances, filtres & recherche', 'Catalogue'],
              ['progression', 'Charges, volume & D+', 'Progression'],
            ] as const
          ).map(([id, over, title]) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex w-full items-baseline gap-3 border-b border-zinc-800 px-4 py-3.5 text-left last:border-b-0 hover:bg-zinc-900"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{over}</span>
              <span className="ml-auto font-display text-[17px] font-black uppercase italic tracking-tight text-zinc-50">{title}</span>
            </button>
          ))}
        </nav>

        {msg && (
          <p className={`mb-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? 'bg-moss/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>{msg.text}</p>
        )}

        <Block title="Sauvegarde locale" desc={`${days} jour(s) d’entraînement stockés sur cet appareil.`}>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={download} icon={Download}>
              Exporter JSON
            </Btn>
            <Btn onClick={() => file.current?.click()} icon={Upload}>
              Importer JSON
            </Btn>
          </div>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void run(async () => `${importJson(await f.text())} jour(s) importé(s) et fusionné(s).`)
            }}
          />
        </Block>

        <Block
          title="Backup cloud — GitHub Gist"
          desc="Optionnel. Copie chiffrée (AES-256, clé dérivée de ton PIN) dans un Gist secret, 20 s après chaque modification."
        >
          <label className="mb-2 flex h-11 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-[13px] text-zinc-200">
            Backup automatique
            <input
              type="checkbox"
              checked={g.enabled}
              onChange={(e) => updateGist({ enabled: e.target.checked })}
              className="h-5 w-5 accent-orange-500"
            />
          </label>
          <Field
            label="Token GitHub (scope « gist » uniquement)"
            value={g.token}
            onChange={(v) => updateGist({ token: v.trim() })}
            placeholder="github_pat_… ou ghp_…"
            type="password"
          />
          <Field label="ID du Gist (vide = création auto)" value={g.gistId} onChange={(v) => updateGist({ gistId: v.trim() })} placeholder="a1b2c3…" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Btn disabled={busy || !g.token} onClick={() => run(async () => (await backupNow(), 'Backup envoyé sur le Gist.'))} icon={CloudUpload}>
              Sauvegarder
            </Btn>
            <Btn
              disabled={busy || !g.token || !g.gistId}
              onClick={() => run(async () => `${await restoreFromGist()} jour(s) restauré(s) depuis le Gist.`)}
              icon={RotateCcw}
            >
              Restaurer
            </Btn>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {g.lastBackup ? `Dernier backup : ${new Date(g.lastBackup).toLocaleString('fr-CA')}` : 'Aucun backup cloud pour l’instant.'}
            {g.lastError && <span className="block text-red-300">Dernière erreur : {g.lastError}</span>}
          </p>
        </Block>

        <Block
          title="PIN de l’appareil"
          desc={
            usingDefaultPin()
              ? '⚠️ PIN par défaut (2026) actif. Définis le secret APP_PASSWORD_HASH sur GitHub ou un PIN local ici.'
              : 'Un PIN local remplace celui défini au build. Le backup Gist est chiffré avec le PIN de la session.'
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nouveau PIN" value={pin1} onChange={(v) => setPin1(v.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" />
            <Field label="Confirmer" value={pin2} onChange={(v) => setPin2(v.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Btn
              disabled={!(pin1.length === 4 || pin1.length === 6) || pin1 !== pin2}
              onClick={() =>
                run(async () => {
                  await setLocalPin(pin1)
                  setPin1('')
                  setPin2('')
                  return 'PIN local enregistré. Pense à refaire un backup Gist (nouvelle clé).'
                })
              }
              icon={KeyRound}
            >
              Enregistrer
            </Btn>
            <Btn
              onClick={() => {
                resetLocalPin()
                setMsg({ ok: true, text: 'PIN local supprimé : retour au PIN du build.' })
              }}
              icon={RotateCcw}
            >
              PIN du build
            </Btn>
          </div>
        </Block>

        <button
          type="button"
          onClick={() => {
            lock()
            onLock()
          }}
          className="mb-6 mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 font-medium text-zinc-200 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" /> Verrouiller maintenant
        </button>
        <p className="mb-6 text-center text-[11px] text-zinc-600">TrailStrong 2026 · v{__APP_VERSION__} · données 100 % locales</p>
      </div>
    </div>,
    document.body,
  )
}

function Block({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="card mb-3 p-3.5">
      <h3 className="text-[14px] font-semibold tracking-tight text-zinc-50">{title}</h3>
      <p className="mb-3 mt-0.5 text-[12px] leading-snug text-zinc-400">{desc}</p>
      {children}
    </section>
  )
}

function Btn({
  children,
  icon: Icon,
  onClick,
  disabled,
}: {
  children: ReactNode
  icon: ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-[13px] font-medium text-zinc-200 transition active:scale-95 disabled:opacity-40"
    >
      <Icon className="h-4 w-4 text-ember" />
      {children}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: 'numeric' | 'text'
}) {
  return (
    <label className="label mb-2 block">
      {label}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-[13px] normal-case tracking-normal text-zinc-100 placeholder:text-zinc-600 focus:border-glacier/50 focus:outline-none"
      />
    </label>
  )
}
