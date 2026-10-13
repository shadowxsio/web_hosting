/** Config Firebase du build (séparée pour ne pas charger le SDK en mode local). */
const env = import.meta.env
export const config = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined)?.trim(),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim(),
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim(),
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined)?.trim(),
}

export const firebaseEnabled = !!(config.apiKey && config.projectId && config.appId)
