import { getSecret } from '../settings'

const BASES = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1'
} as const

export type ProviderName = keyof typeof BASES

/** Lightweight key validation: list models with the stored key. */
export async function testProviderKey(name: ProviderName): Promise<{ ok: boolean; message: string }> {
  const key = getSecret(name)
  if (!key) return { ok: false, message: 'No key stored' }
  try {
    const res = await fetch(`${BASES[name]}/models`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (res.ok) return { ok: true, message: 'Connected ✓' }
    const detail = await res.text().catch(() => '')
    return { ok: false, message: `${res.status} ${detail.slice(0, 100)}` }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}

/** Check that a local Ollama server is reachable and report its pulled models. */
export async function testOllama(endpoint: string): Promise<{ ok: boolean; message: string }> {
  const base = endpoint.replace(/\/+$/, '')
  try {
    const res = await fetch(`${base}/api/tags`)
    if (!res.ok) return { ok: false, message: `Ollama responded ${res.status}` }
    const data = (await res.json()) as { models?: Array<{ name: string }> }
    const names = (data.models ?? []).map((m) => m.name)
    return {
      ok: true,
      message: names.length
        ? `Connected ✓ — models: ${names.slice(0, 6).join(', ')}`
        : 'Connected ✓ — no models pulled yet (run: ollama pull llama3.2)'
    }
  } catch (e) {
    return { ok: false, message: `Not reachable — is Ollama running? (${(e as Error).message})` }
  }
}
