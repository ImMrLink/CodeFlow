import { getSection, getSecret } from '../settings'

export interface Transcript {
  text: string
}

export interface SttEngine {
  readonly id: string
  transcribe(audio: Buffer, mime: string, signal?: AbortSignal): Promise<Transcript>
}

const ENDPOINTS = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1'
} as const

function fileExt(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  return 'webm'
}

/** Groq and OpenAI share the same OpenAI-style transcription endpoint shape. */
async function transcribeOpenAICompatible(
  base: string,
  apiKey: string,
  model: string,
  audio: Buffer,
  mime: string,
  language: string,
  signal?: AbortSignal
): Promise<Transcript> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), `audio.${fileExt(mime)}`)
  form.append('model', model)
  form.append('response_format', 'json')
  if (language && language !== 'auto') form.append('language', language)

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`STT ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { text?: string }
  return { text: (data.text ?? '').trim() }
}

/** Build the configured STT engine, throwing a clear error if the key is missing. */
export function buildSttEngine(): SttEngine {
  const cfg = getSection('stt')
  const provider = cfg.provider
  if (provider === 'local') {
    throw new Error('Local STT is handled by whisper.cpp, not this factory')
  }
  const apiKey = getSecret(provider)
  if (!apiKey) {
    throw new Error(`No ${provider.toUpperCase()} API key set (open Settings → API keys)`)
  }
  const model = provider === 'groq' ? cfg.groqModel : cfg.openaiModel
  const base = ENDPOINTS[provider]
  return {
    id: `${provider}:${model}`,
    transcribe: (audio, mime, signal) =>
      transcribeOpenAICompatible(base, apiKey, model, audio, mime, cfg.language, signal)
  }
}
