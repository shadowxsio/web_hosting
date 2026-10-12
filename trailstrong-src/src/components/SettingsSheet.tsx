import { CloudUpload, Download, KeyRound, Lock, RotateCcw, Upload, X } from 'lucide-react'
import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { exitAdmin, lock, resetLocalPin, setLocalPin, useAdmin, usingDefaultPin } from '../lib/auth'
import { getGoogleSession } from '../lib/googleAuth'
import { PinLock } from './PinLock'
import { useTheme } from '../lib/theme'
import { backupNow, getRecoveryKey, restoreFromGist, setRecoveryKey } from '../lib/backup'
import type { FocusTag } from '../data/program'
import { exportJson, importJson, today, updateGist, useData } from '../lib/storage'
import type { View } from '../App'

export function SettingsSheet({
  onClose,
  onLock,
  onNavigate,
  onTests,
}: {
  onClose: () => void
  onLock: () => void
  onNavigate: (view: View, focus?: FocusTag) => void
  onTests: () => void
}) {
  const data = useData()
  const g = data.gist
  const [theme, setTheme] = useTheme()
  const admin = useAdmin()
  const [askPin, setAskPin] = useState(false)
  const [recovery, setRecovery] = useState('')
  const account = getGoogleSession()
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
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="sheet pb-safe max-h-[92dvh] w-full max-w-xl overflow-y-auto border-[2.5px] border-b-0 border-ink bg-paper-2 px-4 pt-4 md:max-h-none md:w-[460px] md:border-b-[2.5px] md:border-r-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Réglages"
        data-noswipe
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="headline text-[30px]">Menu</h2>
          <button type="button" onClick={onClose} className="b-btn grid h-11 w-11 place-items-center rounded-full" aria-label="Fermer">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        {/* Liste façon quelleia : feuille lignée, surtitre + titre italique */}
        <nav className="lined mb-6 border-[2.5px] border-ink shadow-[6px_6px_0_var(--color-shadow)]">
          {(
            [
              ['all', undefined, '4 séances, 20 exercices', 'Tout le programme'],
              ['all', 'knee', 'Rotule, freinage, valgus', 'Focus genou'],
              ['all', 'ankle', 'Proprioception & propulsion', 'Focus cheville'],
              ['all', 'glutes', 'Grand & moyen fessier', 'Fessiers'],
              ['stats', undefined, 'Charges, volume & D+', 'Progression'],
            ] as const
          ).map(([view, focus, over, title]) => (
            <button
              key={title}
              type="button"
              onClick={() => onNavigate(view, focus)}
              className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 px-4 py-2 text-left transition-colors hover:bg-sun/60"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">{over}</span>
              <span className="text-[19px] font-black uppercase italic leading-tight tracking-tight text-ink">{title}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onTests}
            className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 px-4 py-2 text-left transition-colors hover:bg-sun/60"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">Toutes les 4 semaines, G / D</span>
            <span className="text-[19px] font-black uppercase italic leading-tight tracking-tight text-ink">Tests mensuels</span>
          </button>
          <button
            type="button"
            onClick={() => {
              lock()
              onLock()
            }}
            className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 border-t-[2.5px] border-ink bg-sun px-4 py-2 text-left"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">{account ? account.email : 'Session PIN'}</span>
            <span className="text-[19px] font-black uppercase italic leading-tight tracking-tight">Se déconnecter</span>
          </button>
        </nav>

        <h3 className="headline headline-sun mb-3 text-[22px]">Réglages</h3>

        <Block title="Apparence" desc="Sombre pour le sous-sol du gym, clair façon papier.">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Thème">
            {(
              [
                ['dark', '🌙 Sombre'],
                ['light', '☀️ Clair'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => setTheme(t)}
                className={`b-btn h-11 text-[14px] uppercase italic ${theme === t ? 'b-btn-ink' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Block>

        {msg && (
          <p className={`mb-3 border-2 border-ink px-3 py-2 text-sm font-bold ${msg.ok ? 'bg-mint' : 'bg-rose'}`}>{msg.text}</p>
        )}

        {admin ? (
          <>
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
          desc="Optionnel. Copie chiffrée (AES-256) dans un Gist secret, 20 s après chaque modification. Note la clé de récupération : elle est nécessaire pour restaurer sur un autre appareil."
        >
          <label className="mb-2 flex h-11 items-center justify-between border-2 border-ink bg-paper px-3 text-[13px] text-ink">
            Backup automatique
            <input
              type="checkbox"
              checked={g.enabled}
              onChange={(e) => updateGist({ enabled: e.target.checked })}
              className="h-5 w-5 accent-[#f0773a]"
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
          <p className="mt-2 text-xs text-ink/60">
            {g.lastBackup ? `Dernier backup : ${new Date(g.lastBackup).toLocaleString('fr-CA')}` : 'Aucun backup cloud pour l’instant.'}
            {g.lastError && <span className="block text-danger">Dernière erreur : {g.lastError}</span>}
          </p>
          <div className="mt-3 border-2 border-dashed border-ink p-3">
            <p className="label">Clé de récupération</p>
            <p className="mt-1 select-all font-black italic tracking-wide">{getRecoveryKey()}</p>
            <div className="mt-2 flex gap-2">
              <input
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
                placeholder="Coller une autre clé…"
                className="b-input h-10 min-w-0 flex-1 px-2 text-[12px] uppercase"
              />
              <Btn
                disabled={!recovery}
                onClick={() =>
                  run(async () => {
                    setRecoveryKey(recovery)
                    setRecovery('')
                    return 'Clé de récupération remplacée.'
                  })
                }
                icon={KeyRound}
              >
                Utiliser
              </Btn>
            </div>
          </div>
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
              onClick={exitAdmin}
              className="b-btn b-btn-ink mb-8 mt-1 flex h-12 w-full items-center justify-center gap-2 uppercase italic"
            >
              <Lock className="h-4 w-4" /> Quitter le mode admin
            </button>
          </>
        ) : (
          <section className="b-card mb-8 p-4">
            <h3 className="text-[16px] font-black uppercase italic tracking-tight">🔒 Mode admin</h3>
            <p className="mb-3 mt-1 text-[13px] font-semibold leading-snug text-ink/75">
              Sauvegardes, backup cloud et PIN sont protégés par ton code PIN (10 min d’accès).
            </p>
            <button type="button" onClick={() => setAskPin(true)} className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-sun uppercase italic">
              <KeyRound className="h-4 w-4" /> Saisir le PIN admin
            </button>
          </section>
        )}
        {askPin && <PinLock overlay onUnlock={() => setAskPin(false)} onCancel={() => setAskPin(false)} />}
        <p className="mb-6 text-center text-[11px] text-ink/45">TrailStrong 2026 · v{__APP_VERSION__} · données 100 % locales</p>
      </div>
    </div>,
    document.body,
  )
}

function Block({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="b-card mb-5 p-4">
      <h3 className="text-[16px] font-black uppercase italic tracking-tight">{title}</h3>
      <p className="mb-3 mt-1 text-[13px] font-semibold leading-snug text-ink/75">{desc}</p>
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
      className="b-btn flex h-11 items-center justify-center gap-1.5 px-3 text-[13px] disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
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
        className="mt-1 h-11 w-full border-2 border-ink bg-paper px-3 text-[13px] normal-case tracking-normal text-ink placeholder:text-ink/40 focus:outline-none focus:shadow-[3px_3px_0_#f0773a]"
      />
    </label>
  )
}
