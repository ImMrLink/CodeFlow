import Store from 'electron-store'

export interface Snippet {
  id: string
  trigger: string
  text: string
  at: number
}

interface SnippetsSchema {
  items: Snippet[]
}

const store = new Store<SnippetsSchema>({
  name: 'snippets',
  defaults: { items: [] }
})

let counter = 0

export function getSnippets(): Snippet[] {
  return store.get('items')
}

export function addSnippet(trigger: string, text: string): Snippet {
  const items = store.get('items')
  counter += 1
  const entry: Snippet = {
    id: `${Date.now().toString(36)}-${counter}`,
    trigger: trigger.trim(),
    text: text.trim(),
    at: Date.now()
  }
  store.set('items', [entry, ...items])
  return entry
}

export function deleteSnippet(id: string): void {
  store.set(
    'items',
    store.get('items').filter((s) => s.id !== id)
  )
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[.,!?;:"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Apply snippet triggers to a raw transcript.
 * - Whole-utterance match → returns the expansion and flags `whole` (skip cleanup).
 * - Otherwise replaces any inline trigger phrases (word-boundary, case-insensitive).
 */
export function expandSnippets(raw: string): { text: string; whole: boolean } {
  const items = getSnippets()
  if (items.length === 0) return { text: raw, whole: false }
  const normalized = norm(raw)
  for (const s of items) {
    if (s.trigger && norm(s.trigger) === normalized) return { text: s.text, whole: true }
  }
  let out = raw
  for (const s of items) {
    if (!s.trigger) continue
    const re = new RegExp(`\\b${escapeRe(s.trigger)}\\b`, 'gi')
    out = out.replace(re, s.text)
  }
  return { text: out, whole: false }
}
