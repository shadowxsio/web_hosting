import { CloudUpload, Download, KeyRound, Lock, RotateCcw, Stethoscope, Upload, X } from 'lucide-react'
import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { exitAdmin, lock, resetLocalPin, setLocalPin, useAdmin, usingDefaultPin } from '../lib/auth'
import { getGoogleSession } from '../lib/googleAuth'
import { PinLock } from './PinLock'
import { useTheme } from '../lib/theme'
import { DEFAULT_MODEL, setAiConfig, useAiConfig } from '../lib/ai'
import { setSoundPrefs, sfx, unlockAudio, useSoundPrefs } from '../lib/sound'
import { backupNow, getRecoveryKey, restoreFromGist, setRecoveryKey } from '../lib/backup'
import type { FocusTag } from '../data/program'
import { enterSandbox, inSandbox } from '../lib/sandbox'
import { exportJson, importJson, today, updateGist, updateProfile, useData } from '../lib/storage'
import type { View } from '../App'

export function SettingsSheet({
  onClose,
  onLock,
  onNavigate,
  onTests,
  cloud,
  onTour,
}: {
  onClose: () => void
  onLock: () => void
  onNavigate: (view: View, focus?: FocusTag) => void
  onTests: () => void
  /** Mode comptes (Firebase) : compte, synchro et programme. */
  cloud?: { email: string; status: string; onRedoProgram: () => void; logoutLabel?: string; isOwner?: boolean }
  /** Relance la visite guidée de l'app. */
  onTour?: () => void
}) {
  const data = useData()
  const g = data.gist
  const [theme, setTheme] = useTheme()
  const sound = useSoundPrefs()
  const ai = useAiConfig()
  const [aiKey, setAiKey] = useState('')
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

  const sandboxBlock = !inSandbox && (
    <Block title="🧪 Profil de test" desc="Un profil temporaire pour essayer le questionnaire, la génération de programme, le coach… Rien n’est sauvegardé : tout s’efface quand tu le quittes, tes vraies données ne sont pas touchées.">
      <button type="button" onClick={enterSandbox} className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-lilac text-[13px] uppercase tracking-wide">
        Ouvrir le profil de test
      </button>
    </Block>
  )

  const sharedBlocks = (
    <>
        <Block
          title="Assistant IA (Gemini)"
          desc={ai.key ? `Clé enregistrée sur cet appareil (…${ai.key.slice(-4)}). Elle n’est jamais exportée ni sauvegardée.` : 'Colle ta clé API Gemini (aistudio.google.com → Get API key) pour créer des exercices en décrivant ce que tu veux.'}
        >
          <div className="flex gap-2">
            <input
              id="gemini-key"
              type="password"
              autoComplete="off"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value.trim())}
              placeholder={ai.key ? 'Remplacer la clé…' : 'AIza…'}
              className="b-input h-11 min-w-0 flex-1 px-3 font-mono text-[13px]"
            />
            <button
              type="button"
              disabled={aiKey.length < 20}
              onClick={() => {
                setAiConfig({ key: aiKey })
                setAiKey('')
                setMsg({ ok: true, text: 'Clé Gemini enregistrée sur cet appareil.' })
              }}
              className="b-btn h-11 px-3 text-[13px] uppercase tracking-wide disabled:opacity-40"
            >
              Enregistrer
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor="gemini-model" className="label shrink-0">
              Modèle
            </label>
            <input
              id="gemini-model"
              value={ai.model}
              onChange={(e) => setAiConfig({ model: e.target.value.trim() || DEFAULT_MODEL })}
              className="b-input h-10 min-w-0 flex-1 px-3 font-mono text-[12px]"
            />
            {ai.key && (
              <button type="button" onClick={() => setAiConfig({ key: '' })} className="b-btn h-10 px-3 text-[12px] uppercase tracking-wide">
                Retirer
              </button>
            )}
          </div>
        </Block>

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
    </>
  )

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="sheet pb-safe max-h-[92dvh] w-full max-w-xl overflow-y-auto border-[2.5px] border-b-0 border-ink bg-paper-2 px-4 pt-4 md:max-h-none md:w-[460px] md:border-b-[2.5px] md:border-r-0 rounded-t-[26px] md:rounded-none md:rounded-l-[26px]"
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

        {/* Liste cousue : surtitre + titre */}
        <nav className="lined mb-6 border-[2.5px] border-ink shadow-[0_6px_0_var(--color-shadow)] rounded-xl">
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
              <span className="text-[19px] font-black uppercase tracking-wide leading-tight tracking-tight text-ink">{title}</span>
            </button>
          ))}
          {onTour && (
            <button
              type="button"
              onClick={onTour}
              className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 px-4 py-2 text-left transition-colors hover:bg-sun/60"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">1 minute, pas à pas</span>
              <span className="text-[19px] font-black uppercase tracking-wide leading-tight tracking-tight text-ink">Visite guidée</span>
            </button>
          )}
          <button
            type="button"
            onClick={onTests}
            className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 px-4 py-2 text-left transition-colors hover:bg-sun/60"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">Toutes les 4 semaines, G / D</span>
            <span className="text-[19px] font-black uppercase tracking-wide leading-tight tracking-tight text-ink">Tests mensuels</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!cloud) lock()
              onLock()
            }}
            className="flex min-h-[57px] w-full flex-wrap items-center gap-x-3 border-t-[2.5px] border-ink bg-sun px-4 py-2 text-left"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink/70">{cloud ? cloud.email : account ? account.email : 'Session PIN'}</span>
            <span className="text-[19px] font-black uppercase tracking-wide leading-tight tracking-tight">{cloud?.logoutLabel ?? 'Se déconnecter'}</span>
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
                className={`b-btn h-11 text-[14px] uppercase tracking-wide ${theme === t ? 'b-btn-ink' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Block>

        {cloud && (
          <Block title="Mon compte" desc={`${cloud.email} · ${cloud.status}`}>
            <button type="button" onClick={cloud.onRedoProgram} className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-sun text-[13px] uppercase tracking-wide">
              ✨ Refaire mon programme (questionnaire)
            </button>
            <p className="mt-2 text-[12px] font-semibold text-ink/65">Tes séances, ton historique et tes réglages sont enregistrés dans ton compte et suivent sur tous tes appareils.</p>
          </Block>
        )}

        <Block title="Profil" desc="Ton poids sert à doser les protéines, glucides et l’eau dans le bilan de fin de séance.">
          <div className="flex gap-2">
            <input
              id="profile-weight"
              inputMode="decimal"
              defaultValue={data.profile.weightKg ? String(Math.round((data.profile.weightUnit === 'lbs' ? data.profile.weightKg * 2.20462 : data.profile.weightKg) * 10) / 10) : ''}
              key={data.profile.weightUnit ?? 'kg'}
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace(',', '.'))
                const unit = data.profile.weightUnit ?? 'kg'
                updateProfile({ weightKg: Number.isFinite(v) && v > 0 ? Math.round((unit === 'lbs' ? v / 2.20462 : v) * 10) / 10 : undefined })
              }}
              placeholder="Poids"
              aria-label="Poids"
              className="b-input h-11 min-w-0 flex-1 px-3 font-mono text-[15px]"
            />
            {(['kg', 'lbs'] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={(data.profile.weightUnit ?? 'kg') === u}
                onClick={() => updateProfile({ weightUnit: u })}
                className={`b-btn h-11 w-14 text-[13px] uppercase tracking-wide ${(data.profile.weightUnit ?? 'kg') === u ? 'b-btn-ink' : ''}`}
              >
                {u}
              </button>
            ))}
          </div>
          {data.profile.weightKg && <p className="mt-2 text-[12px] font-semibold text-ink/65">Enregistré : {data.profile.weightKg} kg · repère protéines {Math.round((data.profile.weightKg * 0.3) / 5) * 5}-{Math.round((data.profile.weightKg * 0.4) / 5) * 5} g après la séance.</p>}
        </Block>

        <Block title="Son du coach" desc="Un son différent pour le décompte, le départ, chaque phase, la dernière rep, la fin, le repos et la reprise. La voix (en option) compte les reps.">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Son">
            {(
              [
                ['voice', '🗣️ Voix'],
                ['beep', '🔔 Bips'],
                ['off', '🔇 Muet'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={sound.mode === m}
                onClick={() => setSoundPrefs({ mode: m })}
                className={`b-btn h-11 text-[13px] uppercase tracking-wide ${sound.mode === m ? 'b-btn-ink' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="label mb-1 mt-3">Sortie du son</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Sortie du son">
            {(
              [
                [false, '🎧 Par-dessus YouTube / musique', 'Les bips se mélangent à ta vidéo. En mode silencieux, ils ne sortent que dans les écouteurs.'],
                [true, '🔊 Haut-parleur forcé', 'Bips même en mode silencieux, mais l’iPhone met YouTube / la musique en pause.'],
              ] as const
            ).map(([v, label, hint]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={sound.speaker === v}
                onClick={() => setSoundPrefs({ speaker: v })}
                className={`b-btn px-3 py-2 text-left ${sound.speaker === v ? 'b-btn-ink' : ''}`}
              >
                <span className="block text-[13px] font-black uppercase tracking-wide">{label}</span>
                <span className={`block text-[12px] font-semibold normal-case not-italic leading-snug ${sound.speaker === v ? 'opacity-80' : 'text-ink/65'}`}>{hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio()
              sfx.test()
            }}
            className="b-btn mt-2 h-11 w-full text-[13px] uppercase tracking-wide"
          >
            🔊 Tester le son
          </button>
        </Block>

        {msg && (
          <p className={`mb-3 border-2 border-ink px-3 py-2 text-sm font-bold rounded-xl ${msg.ok ? 'bg-mint' : 'bg-rose'}`}>{msg.text}</p>
        )}

        {cloud ? (
          <>
            {cloud.isOwner && sandboxBlock}
            {sharedBlocks}
          </>
        ) : admin ? (
          <>
        {sandboxBlock}
        {sharedBlocks}

        <Block
          title="Backup cloud — GitHub Gist"
          desc="Optionnel. Copie chiffrée (AES-256) dans un Gist secret, 20 s après chaque modification. Note la clé de récupération : elle est nécessaire pour restaurer sur un autre appareil."
        >
          <label className="mb-2 flex h-11 items-center justify-between border-2 border-ink bg-paper px-3 text-[13px] text-ink rounded-xl">
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
          <div className="mt-3 border-2 border-dashed border-ink p-3 rounded-xl">
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
              className="b-btn b-btn-ink mb-8 mt-1 flex h-12 w-full items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Lock className="h-4 w-4" /> Quitter le mode admin
            </button>
          </>
        ) : (
          <section className="b-card mb-8 p-4">
            <h3 className="text-[16px] font-black uppercase tracking-wide tracking-tight">🔒 Mode admin</h3>
            <p className="mb-3 mt-1 text-[13px] font-semibold leading-snug text-ink/75">
              Sauvegardes, backup cloud et PIN sont protégés par ton code PIN (10 min d’accès).
            </p>
            <button type="button" onClick={() => setAskPin(true)} className="b-btn flex h-12 w-full items-center justify-center gap-2 bg-sun uppercase tracking-wide">
              <KeyRound className="h-4 w-4" /> Saisir le PIN admin
            </button>
          </section>
        )}
        {askPin && <PinLock overlay onUnlock={() => setAskPin(false)} onCancel={() => setAskPin(false)} />}
        <p className="mb-2 flex items-start justify-center gap-1.5 text-center text-[12px] font-semibold leading-snug text-ink/70">
          <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> Repères d’entraînement, pas un avis médical : en cas de douleur ou de blessure, consulte un physio.
        </p>
        <p className="mb-6 text-center text-[11px] text-ink/45">TrailStrong 2026 · v{__APP_VERSION__} · {cloud ? 'données synchronisées sur ton compte' : 'données 100 % locales'}</p>
      </div>
    </div>,
    document.body,
  )
}

function Block({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="b-card mb-5 p-4">
      <h3 className="text-[16px] font-black uppercase tracking-wide tracking-tight">{title}</h3>
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
        className="mt-1 h-11 w-full border-2 border-ink bg-paper px-3 text-[13px] normal-case tracking-normal text-ink placeholder:text-ink/40 focus:outline-none focus:shadow-[0_3px_0_var(--color-flame)] rounded-xl"
      />
    </label>
  )
}
