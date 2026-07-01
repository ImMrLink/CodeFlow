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
