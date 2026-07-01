import Store from 'electron-store'

export interface HistoryEntry {
  id: string
  at: number // epoch ms
  text: string
  chars: number
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

export function addHistory(text: string, engine: string): void {
  const items = store.get('items')
  counter += 1
  const entry: HistoryEntry = {
    id: `${Date.now().toString(36)}-${counter}`,
    at: Date.now(),
    text,
    chars: text.length,
    engine
  }
  store.set('items', [entry, ...items].slice(0, MAX_ITEMS))
}

export function getHistory(): HistoryEntry[] {
  return store.get('items')
}

export function clearHistory(): void {
  store.set('items', [])
}
