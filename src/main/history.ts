import Store from 'electron-store'

export interface HistoryEntry {
  id: string
  at: number // epoch ms
  text: string
  chars: number
  words: number
  ms: number // speaking duration; 0 when unknown (older entries)
  engine: string
}

interface HistorySchema {
  items: HistoryEntry[]
}

const MAX_ITEMS = 100

const store = new Store<HistorySchema>({
  name: 'history',
  defaults: { items: [] }
})

let counter = 0

/** Word count used for stats — collapse whitespace, ignore empties. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function addHistory(text: string, engine: string, ms = 0): void {
  const items = store.get('items')
  counter += 1
  const entry: HistoryEntry = {
    id: `${Date.now().toString(36)}-${counter}`,
    at: Date.now(),
    text,
    chars: text.length,
    words: countWords(text),
    ms: Math.max(0, Math.round(ms)),
    engine
  }
  store.set('items', [entry, ...items].slice(0, MAX_ITEMS))
}

export function getHistory(): HistoryEntry[] {
  // Backfill fields added in later versions so the renderer never sees undefined.
  return store.get('items').map((e) => ({
    ...e,
    words: e.words ?? countWords(e.text),
    ms: e.ms ?? 0
  }))
}

export function clearHistory(): void {
  store.set('items', [])
}
