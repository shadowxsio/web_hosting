/**
 * Firebase (comptes + stockage en ligne). Activé seulement si la config est
 * fournie au build (variables GitHub FIREBASE_*) ; sinon l'app reste en mode
 * local historique (un seul utilisateur, données sur l'appareil).
 *
 * Connexion : le bouton Google Identity Services (déjà utilisé) fournit un
 * jeton d'identité Google, échangé contre une session Firebase
 * (signInWithCredential) — pas de popup ni de redirection, ce qui marche aussi
 * dans les navigateurs iOS (Arc, Safari, PWA).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { config, firebaseEnabled, recaptchaSiteKey } from './firebaseConfig'

export { firebaseEnabled }

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function fb() {
  if (!firebaseEnabled) throw new Error('Firebase non configuré.')
  if (!app) {
    app = initializeApp(config)
    // App Check : Firebase n'accepte que les requêtes venant vraiment de ce site
    // (pas d'un script ou d'un bot qui réutiliserait la config publique).
    // Invisible pour l'utilisateur ; à « appliquer » ensuite dans la console Firebase.
    if (recaptchaSiteKey && !(import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR)) {
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey), isTokenAutoRefreshEnabled: true })
    }
  }
  // Sans popupRedirectResolver : aucun iframe / script Google supplémentaire.
  auth ??= initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  // Cache local persistant : l'app marche hors-ligne au gym, la synchro reprend ensuite.
  if (!db) {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), ignoreUndefinedProperties: true })
    // Tests locaux uniquement (émulateurs Firebase).
    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(db, '127.0.0.1', 8080)
    }
  }
  return { app, auth, db }
}

/** Premier état de connexion (restauré depuis l'appareil, même hors-ligne). */
export function currentUser(): Promise<User | null> {
  const { auth } = fb()
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => {
      off()
      resolve(u)
    })
  })
}

export async function signInWithGoogleToken(idToken: string) {
  const { auth } = fb()
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
  return cred.user
}

export async function firebaseSignOut() {
  if (!firebaseEnabled) return
  await signOut(fb().auth)
}

export type { User }
