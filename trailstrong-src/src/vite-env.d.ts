/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PASSWORD_HASH?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

declare const __APP_VERSION__: string
declare const __ALLOWED_EMAIL_HASHES__: string[]
