import { getSection, getSecret } from '../settings'

export interface LlmEngine {
  readonly id: string
  clean(rawText: string, signal?: AbortSignal): Promise<string>
}

const ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1'
} as const

const CLEANUP_SYSTEM = `You are a dictation post-processor. The user message is a raw speech-to-text transcript. Rewrite it into clean, natural written text:
- Fix punctuation, capitalization, and obvious transcription errors.
- Remove filler words (um, uh, like, you know) and false starts.
- Apply spoken self-corrections (e.g. "let's meet at 2, actually 3" -> keep "3"; honor "scratch that").
- Format clearly-spoken lists ("first... second...") as lists.
- Preserve the speaker's meaning, wording, and tone. Do NOT answer questions, add content, or add commentary.
Output ONLY the cleaned text — no quotes, no preamble, no explanation.`

async function chatOllama(
  base: string,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`Ollama ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { message?: { content?: string } }
  return (data.message?.content ?? '').trim()
}

async function chatOpenAICompatible(
  base: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`LLM ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

/** Build the configured LLM cleanup engine, throwing a clear error if unavailable. */
export function buildLlmEngine(): LlmEngine {
  const cfg = getSection('llm')
  const provider = cfg.provider

  if (provider === 'ollama') {
    const base = cfg.ollamaEndpoint.replace(/\/+$/, '')
    const model = cfg.ollamaModel
    return {
      id: `ollama:${model}`,
      clean: (raw, signal) => chatOllama(base, model, CLEANUP_SYSTEM, raw, signal)
    }
  }

  const apiKey = getSecret(provider)
  if (!apiKey) {
    throw new Error(`No ${provider.toUpperCase()} API key set (open Settings → API keys)`)
  }
  const model = provider === 'openai' ? cfg.openaiModel : cfg.groqModel
  const base = ENDPOINTS[provider]
  return {
    id: `${provider}:${model}`,
    clean: (raw, signal) => chatOpenAICompatible(base, apiKey, model, CLEANUP_SYSTEM, raw, signal)
  }
}
