import Store from 'electron-store'

export interface Note {
  id: string
  title: string
  body: string
  at: number
}

interface NotesSchema {
  items: Note[]
}

const store = new Store<NotesSchema>({
  name: 'notes',
  defaults: { items: [] }
})

let counter = 0

const titleOf = (body: string): string => {
  const first = body.split('\n').map((l) => l.trim()).find(Boolean)
  return first ? first.slice(0, 80) : 'Untitled note'
}

export function getNotes(): Note[] {
  return store.get('items')
}

export function addNote(body = ''): Note {
  const items = store.get('items')
  counter += 1
  const note: Note = {
    id: `${Date.now().toString(36)}-${counter}`,
    title: titleOf(body),
    body,
    at: Date.now()
  }
  store.set('items', [note, ...items])
  return note
}

export function updateNote(id: string, body: string): Note[] {
  store.set(
    'items',
    store.get('items').map((n) => (n.id === id ? { ...n, title: titleOf(body), body, at: Date.now() } : n))
  )
  return getNotes()
}

export function deleteNote(id: string): Note[] {
  store.set(
    'items',
    store.get('items').filter((n) => n.id !== id)
  )
  return getNotes()
}
