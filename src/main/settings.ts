import Store from 'electron-store'
import { safeStorage } from 'electron'

/**
 * Persistent settings. Non-secret values are stored in plaintext via electron-store.
 * Secrets (API keys) are encrypted with the OS keystore (Windows DPAPI) via safeStorage
 * and only the base64 ciphertext is written to disk.
 */
export interface SettingsSchema {
  general: {
    launchOnStartup: boolean
    activationMode: 'push-to-talk' | 'toggle'
  }
  providers: {
    stt: string
    llm: string
  }
  secrets: Record<string, string> // name -> base64 ciphertext
}

const store = new Store<SettingsSchema>({
  defaults: {
    general: { launchOnStartup: false, activationMode: 'push-to-talk' },
    providers: { stt: 'groq', llm: 'anthropic' },
    secrets: {}
  }
})

/** Renderer-safe view of settings: never exposes secret ciphertext, only the names present. */
export function getPublicSettings() {
  const { secrets, ...rest } = store.store
  return { ...rest, secretNames: Object.keys(secrets ?? {}) }
}

export function setValue(key: string, value: unknown): void {
  // key is a dot-path, e.g. "providers.stt"
  store.set(key, value as never)
}

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function setSecret(name: string, plaintext: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption is not available on this machine')
  }
  const ciphertext = safeStorage.encryptString(plaintext).toString('base64')
  const secrets = { ...(store.get('secrets') as Record<string, string>) }
  secrets[name] = ciphertext
  store.set('secrets', secrets)
}

export function getSecret(name: string): string | null {
  const secrets = store.get('secrets') as Record<string, string>
  const ciphertext = secrets?.[name]
  if (!ciphertext) return null
  return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))
}

export function hasSecret(name: string): boolean {
  const secrets = store.get('secrets') as Record<string, string>
  return Boolean(secrets?.[name])
}

export function clearSecret(name: string): void {
  const secrets = { ...(store.get('secrets') as Record<string, string>) }
  delete secrets[name]
  store.set('secrets', secrets)
}
