import Store from 'electron-store'
import { safeStorage } from 'electron'

export type ModifierName = 'Ctrl' | 'Alt' | 'Shift' | 'Meta'

/**
 * Persistent settings. Non-secret values are stored in plaintext via electron-store.
 * Secrets (API keys) are encrypted with the OS keystore (Windows DPAPI) via safeStorage;
 * only the base64 ciphertext is written to disk.
 */
export interface SettingsSchema {
  general: {
    launchOnStartup: boolean
    activationMode: 'push-to-talk' | 'toggle'
    scratchpadShortcut: boolean // global Ctrl+Shift+S to open a new scratchpad note
  }
  hotkey: {
    /** Modifiers that must all be held for push-to-talk. */
    pttModifiers: ModifierName[]
  }
  stt: {
    provider: 'groq' | 'openai' | 'local'
    groqModel: string
    openaiModel: string
    localModel: string // whisper.cpp ggml filename, e.g. ggml-small.en-q5_1.bin
    language: string // 'auto' or an ISO code
  }
  llm: {
    enabled: boolean
    provider: 'openai' | 'groq' | 'ollama'
    openaiModel: string
    groqModel: string
    ollamaModel: string
    ollamaEndpoint: string
  }
  secrets: Record<string, string> // name -> base64 ciphertext
}

const DEFAULTS: SettingsSchema = {
  general: { launchOnStartup: false, activationMode: 'push-to-talk', scratchpadShortcut: false },
  hotkey: { pttModifiers: ['Ctrl', 'Alt'] },
  stt: {
    provider: 'groq',
    groqModel: 'whisper-large-v3-turbo',
    openaiModel: 'gpt-4o-transcribe',
    localModel: 'ggml-small.en-q5_1.bin',
    language: 'auto'
  },
  llm: {
    enabled: true,
    provider: 'openai',
    openaiModel: 'gpt-4o-mini',
    groqModel: 'llama-3.3-70b-versatile',
    ollamaModel: 'llama3.2',
    ollamaEndpoint: 'http://localhost:11434'
  },
  secrets: {}
}

const store = new Store<SettingsSchema>({ defaults: DEFAULTS })

/**
 * electron-store only shallow-merges top-level defaults, so a settings section
 * persisted by an older build (e.g. an `stt` object saved before `localModel`
 * existed) is missing keys added later — reading them yields `undefined`, which
 * crashes both the renderer and the STT/LLM backends. Backfill any absent keys
 * from DEFAULTS one level deep. Existing values (including secrets) are untouched.
 */
function backfillDefaults(): void {
  for (const section of Object.keys(DEFAULTS) as (keyof SettingsSchema)[]) {
    const def = DEFAULTS[section]
    if (!def || typeof def !== 'object' || Array.isArray(def)) continue
    const current = (store.get(section) ?? {}) as Record<string, unknown>
    const merged = { ...current }
    let changed = false
    for (const [k, v] of Object.entries(def)) {
      if (!(k in merged)) {
        merged[k] = v
        changed = true
      }
    }
    if (changed) store.set(section, merged as never)
  }
}
backfillDefaults()

/** Provider names that can hold an API key (the only valid entries in `secrets`). */
const KNOWN_SECRETS = ['groq', 'openai']

/**
 * Remove keys left behind by earlier builds: top-level keys not in the schema
 * (e.g. a legacy `providers` object) and secrets for providers that no longer
 * exist (e.g. `anthropic`). Purely cosmetic — nothing reads these — but it keeps
 * config.json tidy and avoids leaking stale ciphertext.
 */
function pruneUnknown(): void {
  const allowed = new Set(Object.keys(DEFAULTS))
  for (const key of Object.keys(store.store)) {
    if (!allowed.has(key)) store.delete(key as keyof SettingsSchema)
  }
  const secrets = store.get('secrets') as Record<string, string>
  const kept = Object.fromEntries(
    Object.entries(secrets ?? {}).filter(([name]) => KNOWN_SECRETS.includes(name))
  )
  if (Object.keys(kept).length !== Object.keys(secrets ?? {}).length) {
    store.set('secrets', kept)
  }
}
pruneUnknown()

export function getSection<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
  return store.get(key)
}

/** Renderer-safe view: never exposes secret ciphertext, only which names exist. */
export function getPublicSettings() {
  const { secrets, ...rest } = store.store
  return { ...rest, secretNames: Object.keys(secrets ?? {}) }
}

export function setValue(key: string, value: unknown): void {
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
