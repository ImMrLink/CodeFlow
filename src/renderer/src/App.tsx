import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconSidebar,
  IconAccount,
  IconBell,
  IconMinimize,
  IconMaximize,
  IconRestore,
  IconClose,
  IconHome,
  IconHistory,
  IconSettings,
  IconInsights,
  IconSnippets,
  IconScratch,
  IconHelp,
  IconCopy,
  IconTrash,
  IconX
} from './icons'

interface PublicSettings {
  general: { launchOnStartup: boolean; activationMode: string; scratchpadShortcut: boolean }
  hotkey: { pttModifiers: string[] }
  stt: {
    provider: 'groq' | 'openai' | 'local'
    groqModel: string
    openaiModel: string
    localModel: string
    language: string
  }
  llm: {
    enabled: boolean
    provider: 'openai' | 'groq' | 'ollama'
    openaiModel: string
    groqModel: string
    ollamaModel: string
    ollamaEndpoint: string
  }
  secretNames: string[]
}

interface HistoryEntry {
  id: string
  at: number
  text: string
  chars: number
  words: number
  ms: number
  engine: string
  app: string
  fixes: number
  fillersRemoved: number
}

interface Snippet {
  id: string
  trigger: string
  text: string
}
interface Note {
  id: string
  title: string
  body: string
  at: number
}

type StatusPayload = { state: string; message?: string }
type LocalStatus = { engine: boolean; model: boolean }
type Page = 'home' | 'insights' | 'history' | 'snippets' | 'scratchpad' | 'settings'

const MODS = [
  { v: 'Ctrl', label: 'Ctrl' },
  { v: 'Alt', label: 'Alt' },
  { v: 'Shift', label: 'Shift' },
  { v: 'Meta', label: 'Win' }
]
const label = (m: string): string => (m === 'Meta' ? 'Win' : m)

const pad = (n: number): string => String(n).padStart(2, '0')
const timeOf = (at: number): string => {
  const d = new Date(at)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const startOfDay = (t: number): number => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
const dayLabel = (at: number): string => {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(at)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return new Date(at).toLocaleDateString()
}
const computeStreak = (items: HistoryEntry[]): number => {
  const days = new Set(items.map((h) => startOfDay(h.at)))
  let streak = 0
  let cur = startOfDay(Date.now())
  while (days.has(cur)) {
    streak += 1
    cur -= 86400000
  }
  return streak
}

const HEAT = [
  'var(--active)',
  'color-mix(in oklab, var(--accent) 18%, var(--panel))',
  'color-mix(in oklab, var(--accent) 40%, var(--panel))',
  'color-mix(in oklab, var(--accent) 65%, var(--panel))',
  'color-mix(in oklab, var(--accent) 92%, var(--panel))'
]

function Toggle(props: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`cf-toggle ${props.on ? 'on' : ''}`}
      role="switch"
      aria-checked={props.on}
      aria-label={props.label}
      onClick={props.onClick}
    >
      <span className="knob" />
    </button>
  )
}

function KeyRow(props: { name: string; label: string; placeholder: string; stored: boolean; onChanged: () => void }) {
  const [val, setVal] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!val.trim()) {
      setMsg('Enter a key first')
      return
    }
    await window.codeflow.setSecret(props.name, val.trim())
    setVal('')
    setMsg('✓ Saved to OS keystore')
    props.onChanged()
  }
  const test = async () => {
    setBusy(true)
    setMsg('Testing…')
    const r = await window.codeflow.testProvider(props.name)
    setMsg(r.message)
    setBusy(false)
  }
  const clear = async () => {
    await window.codeflow.clearSecret(props.name)
    setMsg('Cleared')
    props.onChanged()
  }

  return (
    <div className="cf-keyrow">
      <div className="cf-keyrow-head">
        <div className="cf-field-label">{props.label}</div>
        <div className={`cf-stored ${props.stored ? 'on' : ''}`}>{props.stored ? '● stored' : '○ not set'}</div>
      </div>
      <div className="cf-keyrow-actions">
        <input
          className="cf-input grow"
          type="password"
          placeholder={props.stored ? '•••••••• (stored)' : props.placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button className="cf-btn-dark" onClick={save}>Save</button>
        <button className="cf-btn-ghost" onClick={test} disabled={!props.stored || busy}>Test</button>
        <button className="cf-btn-clear" onClick={clear} disabled={!props.stored}>Clear</button>
      </div>
      {msg && <div className="cf-result">{msg}</div>}
    </div>
  )
}

export default function App() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [, setStatus] = useState<StatusPayload>({ state: 'idle' })
  const [page, setPage] = useState<Page>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [snipHero, setSnipHero] = useState(true)
  const [scratchHero, setScratchHero] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [localSt, setLocalSt] = useState<LocalStatus | null>(null)
  const [localMsg, setLocalMsg] = useState('')
  const [localBusy, setLocalBusy] = useState(false)
  const [ollamaMsg, setOllamaMsg] = useState('')
  const [insightsTab, setInsightsTab] = useState<'usage' | 'voice'>('usage')
  const [addingSnip, setAddingSnip] = useState(false)
  const [newTrigger, setNewTrigger] = useState('')
  const [newText, setNewText] = useState('')
  const [editNote, setEditNote] = useState<string | null>(null)
  const [noteBody, setNoteBody] = useState('')
  const saveTimer = useRef<number | undefined>(undefined)

  const loadHistory = useCallback(async () => setHistory(await window.codeflow.getHistory()), [])

  const refresh = useCallback(async () => {
    setSettings(await window.codeflow.getSettings())
    setHistory(await window.codeflow.getHistory())
    setSnippets(await window.codeflow.getSnippets())
    setNotes(await window.codeflow.getNotes())
  }, [])

  const openEditor = useCallback((n: Note) => {
    setEditNote(n.id)
    setNoteBody(n.body)
  }, [])

  useEffect(() => {
    refresh()
    const off = window.codeflow.onStatus((s) => {
      setStatus(s)
      if (s.state === 'done') void loadHistory()
    })
    const offLocal = window.codeflow.onLocalProgress((m) => setLocalMsg(m))
    const offMax = window.codeflow.onMaximizeChange(setMaximized)
    const offNote = window.codeflow.onScratchpadNewNote(async () => {
      setPage('scratchpad')
      const list = await window.codeflow.addNote('')
      setNotes(list)
      if (list[0]) openEditor(list[0])
    })
    return () => {
      off()
      offLocal()
      offMax()
      offNote()
    }
  }, [refresh, loadHistory, openEditor])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.body.dataset.theme = mq.matches ? 'dark' : 'light'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (settings?.stt.provider === 'local') {
      window.codeflow.getLocalStatus().then((s) => setLocalSt({ engine: s.engine, model: s.model }))
    }
  }, [settings?.stt.provider, settings?.stt.localModel])

  const update = async (key: string, value: unknown) => {
    setSettings(await window.codeflow.setSetting(key, value))
  }

  if (!settings) {
    return <div className="cf-app" />
  }

  const mods = settings.hotkey.pttModifiers
  const chord = mods.map(label).join('+')
  const isToggleMode = settings.general.activationMode === 'toggle'

  const toggleMod = (v: string) => {
    const next = mods.includes(v) ? mods.filter((x) => x !== v) : [...mods, v]
    if (next.length === 0) return
    void update('hotkey.pttModifiers', next)
  }

  const need = new Set<string>()
  if (settings.stt.provider !== 'local' && !settings.secretNames.includes(settings.stt.provider))
    need.add(settings.stt.provider)
  if (settings.llm.enabled && settings.llm.provider !== 'ollama' && !settings.secretNames.includes(settings.llm.provider))
    need.add(settings.llm.provider)
  const pendingCount = need.size

  // ---- derived stats ----
  const totalWords = history.reduce((a, h) => a + (h.words || 0), 0)
  const totalMs = history.reduce((a, h) => a + (h.ms || 0), 0)
  const wpm = totalMs > 0 ? Math.round(totalWords / (totalMs / 60000)) : null
  const streak = computeStreak(history)
  const todayRows = history.filter((h) => dayLabel(h.at) === 'Today').slice(0, 4)

  const totalFixes = history.reduce((a, h) => a + (h.fixes || 0), 0)
  const totalFillers = history.reduce((a, h) => a + (h.fillersRemoved || 0), 0)
  const wordsCorrected = Math.max(0, totalFixes - totalFillers)

  const monthKey = (t: number): number => {
    const d = new Date(t)
    return d.getFullYear() * 12 + d.getMonth()
  }
  const thisMK = monthKey(Date.now())
  const wordsThisMonth = history.filter((h) => monthKey(h.at) === thisMK).reduce((a, h) => a + (h.words || 0), 0)
  const wordsLastMonth = history.filter((h) => monthKey(h.at) === thisMK - 1).reduce((a, h) => a + (h.words || 0), 0)
  const momPct = wordsLastMonth > 0 ? Math.round(((wordsThisMonth - wordsLastMonth) / wordsLastMonth) * 100) : null

  const appCounts: Record<string, number> = {}
  history.forEach((h) => {
    if (h.app) appCounts[h.app] = (appCounts[h.app] || 0) + 1
  })
  const appTotal = Object.values(appCounts).reduce((a, b) => a + b, 0)
  const appBars = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, c]) => ({ name, pct: Math.round((c / appTotal) * 100), count: c }))

  const dayCount: Record<number, number> = {}
  history.forEach((h) => {
    const k = startOfDay(h.at)
    dayCount[k] = (dayCount[k] || 0) + 1
  })
  const heatCells: number[] = []
  for (let i = 69; i >= 0; i--) {
    const c = dayCount[startOfDay(Date.now() - i * 86400000)] || 0
    heatCells.push(c === 0 ? 0 : c === 1 ? 1 : c <= 2 ? 2 : c <= 4 ? 3 : 4)
  }
  const sortedDays = [...new Set(history.map((h) => startOfDay(h.at)))].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  let prevDay: number | null = null
  for (const d of sortedDays) {
    run = prevDay !== null && d - prevDay === 86400000 ? run + 1 : 1
    longest = Math.max(longest, run)
    prevDay = d
  }

  const arc = Math.PI * 40
  const gaugeFrac = wpm != null ? Math.min(1, wpm / 200) : 0
  const gaugeDash = `${(arc * gaugeFrac).toFixed(1)} ${arc.toFixed(1)}`

  // ---- actions ----
  const copyRow = (id: string, text: string) => {
    void window.codeflow.copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1300)
  }
  const CopyBtn = ({ id, text }: { id: string; text: string }) =>
    copiedId === id ? (
      <span className="cf-copied">Copied</span>
    ) : (
      <button className="cf-icon-btn" title="Copy" onClick={() => copyRow(id, text)}>
        <IconCopy />
      </button>
    )

  const isLocal = settings.stt.provider === 'local'
  const engineReady = !!localSt?.engine && !!localSt?.model
  const downloadLabel = localBusy ? 'Downloading…' : engineReady ? 'Verify' : 'Download'
  const downloadLocal = async () => {
    setLocalBusy(true)
    setLocalMsg('Starting…')
    const r = await window.codeflow.ensureLocal()
    setLocalBusy(false)
    setLocalSt({ engine: r.engine, model: r.model })
    setLocalMsg(r.ok ? '✓ Ready' : `Error: ${r.message}`)
  }
  const testOllama = async () => {
    setOllamaMsg('Testing…')
    const r = await window.codeflow.testProvider('ollama')
    setOllamaMsg(r.message)
  }

  const saveSnippet = async () => {
    if (!newTrigger.trim() || !newText.trim()) return
    setSnippets(await window.codeflow.addSnippet(newTrigger.trim(), newText.trim()))
    setNewTrigger('')
    setNewText('')
    setAddingSnip(false)
  }
  const delSnippet = async (id: string) => setSnippets(await window.codeflow.deleteSnippet(id))

  const newNote = async () => {
    const list = await window.codeflow.addNote('')
    setNotes(list)
    if (list[0]) openEditor(list[0])
  }
  const onNoteChange = (body: string) => {
    setNoteBody(body)
    if (!editNote) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      setNotes(await window.codeflow.updateNote(editNote, body))
    }, 500)
  }
  const closeEditor = async () => {
    if (editNote) {
      window.clearTimeout(saveTimer.current)
      setNotes(await window.codeflow.updateNote(editNote, noteBody))
    }
    setEditNote(null)
    setNoteBody('')
  }
  const delNote = async (id: string) => {
    if (editNote === id) {
      setEditNote(null)
      setNoteBody('')
    }
    setNotes(await window.codeflow.deleteNote(id))
  }

  const navItems: { key: Page; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <IconHome /> },
    { key: 'insights', label: 'Insights', icon: <IconInsights /> },
    { key: 'history', label: 'History', icon: <IconHistory /> },
    { key: 'snippets', label: 'Snippets', icon: <IconSnippets /> },
    { key: 'scratchpad', label: 'Scratchpad', icon: <IconScratch /> }
  ]

  return (
    <div className="cf-app">
      <div className="cf-titlebar">
        <div className="cf-titlebar-group">
          <button className="tb-btn" title="Toggle sidebar" onClick={() => setCollapsed((c) => !c)}>
            <IconSidebar />
          </button>
          <button className="tb-btn" title="Account">
            <IconAccount />
          </button>
        </div>
        <div className="cf-titlebar-group">
          <button className="tb-btn" title="Notifications">
            <IconBell />
          </button>
          <button className="tb-btn" title="Minimize" onClick={() => window.codeflow.minimizeWindow()}>
            <IconMinimize />
          </button>
          <button className="tb-btn" title="Maximize" onClick={() => window.codeflow.toggleMaximizeWindow()}>
            {maximized ? <IconRestore /> : <IconMaximize />}
          </button>
          <button className="tb-btn close" title="Close" onClick={() => window.codeflow.closeWindow()}>
            <IconClose />
          </button>
        </div>
      </div>

      <div className="cf-body">
        <div className={`cf-sidebar ${collapsed ? 'collapsed' : ''}`}>
          <div className="cf-brand">
            <span className="cf-bars" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="cf-wordmark">CODEFLOW</span>
          </div>
          {navItems.map((n) => (
            <button
              key={n.key}
              className={`cf-nav ${page === n.key ? 'is-active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          <div className="cf-nav-spacer" />
          <button className={`cf-nav ${page === 'settings' ? 'is-active' : ''}`} onClick={() => setPage('settings')}>
            <IconSettings />
            Settings
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
          <button className="cf-nav">
            <IconHelp />
            Help
          </button>
        </div>

        <div className="cf-panel">
          {/* ---------------- HOME ---------------- */}
          {page === 'home' && (
            <div className="cf-screen">
              <div>
                <div className="cf-title">Welcome back</div>
                <div className="cf-subtitle">Hold your hotkey and speak — text lands wherever your cursor is.</div>
              </div>
              {heroVisible && (
                <div className="cf-hero">
                  <div className="cf-hero-title">
                    Type with your voice, <em>anywhere</em>.
                  </div>
                  <div className="cf-hero-body">
                    Hold {chord}, say what you mean, release. Clean text — punctuated, no fillers — is typed into the
                    focused app.
                  </div>
                  <button className="cf-hero-cta" onClick={() => setPage('settings')}>
                    Set up your hotkey
                  </button>
                  <button className="cf-hero-x" title="Dismiss" onClick={() => setHeroVisible(false)}>
                    <IconX />
                  </button>
                </div>
              )}
              <div className="cf-stats">
                <div className="cf-stat">
                  <div className="cf-stat-num">{totalWords.toLocaleString()}</div>
                  <div className="cf-stat-label">Words dictated</div>
                </div>
                <div className="cf-stat">
                  <div className="cf-stat-num">
                    {wpm ?? '—'}
                    <span className="cf-stat-unit"> wpm</span>
                  </div>
                  <div className="cf-stat-label">Speaking pace</div>
                </div>
                <div className="cf-stat">
                  <div className="cf-stat-num">
                    {streak}
                    <span className="cf-stat-unit"> days</span>
                  </div>
                  <div className="cf-stat-label">Streak</div>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="cf-head-row" style={{ marginBottom: 4 }}>
                  <div className="cf-section-label">Today</div>
                  <button className="cf-link" onClick={() => setPage('history')}>View all →</button>
                </div>
                {todayRows.length === 0 ? (
                  <div className="cf-hint" style={{ padding: '10px 2px' }}>No dictations yet today.</div>
                ) : (
                  todayRows.map((h) => (
                    <div className="cf-row" key={h.id}>
                      <span className="cf-row-time">{timeOf(h.at)}</span>
                      <span className="cf-row-text">{h.text}</span>
                      <CopyBtn id={h.id} text={h.text} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---------------- INSIGHTS ---------------- */}
          {page === 'insights' && (
            <div className="cf-screen">
              <div>
                <div className="cf-title">Insights</div>
                <div className="cf-subtitle">How you dictate, on this machine.</div>
              </div>
              <div className="cf-tabs">
                <button className={`cf-tab ${insightsTab === 'usage' ? 'on' : ''}`} onClick={() => setInsightsTab('usage')}>Usage</button>
                <button className={`cf-tab ${insightsTab === 'voice' ? 'on' : ''}`} onClick={() => setInsightsTab('voice')}>Voice</button>
              </div>

              {insightsTab === 'usage' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="cf-grid-3">
                    <div className="cf-ins-card">
                      <div className="cf-stat-num">{wpm ?? '—'}</div>
                      <div className="cf-stat-label">Words per minute</div>
                      <div className="cf-gauge-wrap">
                        <svg width="126" height="70" viewBox="0 0 100 55">
                          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--active)" strokeWidth="9" strokeLinecap="round" />
                          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray={gaugeDash} />
                        </svg>
                        <div className="cf-gauge-cap">
                          {wpm != null ? <>{Math.round(gaugeFrac * 100)}% of 200</> : 'No data yet'}
                        </div>
                      </div>
                    </div>
                    <div className="cf-ins-card">
                      <div className="cf-stat-num">{totalFixes.toLocaleString()}</div>
                      <div className="cf-stat-label">Fixes made</div>
                      <div className="cf-fixes">
                        <div className="cf-fixes-row"><span>Words corrected</span><span className="cf-mono-muted">{wordsCorrected.toLocaleString()}</span></div>
                        <div className="cf-fixes-row"><span>Fillers removed</span><span className="cf-mono-muted">{totalFillers.toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="cf-ins-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div className="cf-stat-num">{totalWords.toLocaleString()}</div>
                        {momPct != null && <span className="cf-badge-up">{momPct >= 0 ? '+' : ''}{momPct}% this month</span>}
                      </div>
                      <div className="cf-stat-label">Total words dictated</div>
                      <div className="cf-card-foot">All data stays on this PC.</div>
                    </div>
                  </div>
                  <div className="cf-grid-2">
                    <div className="cf-ins-card" style={{ gap: 6 }}>
                      <div className="cf-head-row" style={{ marginBottom: 6 }}>
                        <div className="cf-card-title">Where you dictate</div>
                        <span className="cf-mono-muted">{Object.keys(appCounts).length} APPS</span>
                      </div>
                      {appBars.length === 0 ? (
                        <div className="cf-hint">No app data yet — dictate into a few apps and they'll show here.</div>
                      ) : (
                        appBars.map((b) => (
                          <div className="cf-bar-row" key={b.name}>
                            <span className="cf-bar-label">{b.name}</span>
                            <div className="cf-bar-track"><div className="cf-bar-fill" style={{ width: `${b.pct}%` }} /></div>
                            <span className="cf-bar-meta">{b.pct}% · {b.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="cf-ins-card" style={{ gap: 14 }}>
                      <div className="cf-head-row">
                        <div className="cf-card-title">{streak}-day streak</div>
                        <span className="cf-mono-muted">LONGEST · {longest}</span>
                      </div>
                      <div className="cf-heat">
                        {heatCells.map((lvl, i) => (
                          <span key={i} style={{ background: HEAT[lvl] }} />
                        ))}
                      </div>
                      <div className="cf-heat-legend">
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 2 }}>Less</span>
                        {HEAT.map((c, i) => (
                          <span key={i} className="sw" style={{ background: c }} />
                        ))}
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>More</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cf-empty">
                  <div className="cf-empty-title">Not enough voice data yet</div>
                  <div>Keep dictating — accuracy and pace trends will show up here.</div>
                </div>
              )}
            </div>
          )}

          {/* ---------------- HISTORY ---------------- */}
          {page === 'history' && (
            <div className="cf-screen">
              <div className="cf-head-row">
                <div>
                  <div className="cf-title">History</div>
                  <div className="cf-subtitle">
                    {history.length > 0 ? `${history.length} dictations · stored locally` : 'Stored locally'}
                  </div>
                </div>
                {history.length > 0 && (
                  <button className="cf-btn-outline-accent" onClick={async () => setHistory(await window.codeflow.clearHistory())}>
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="cf-empty">
                  <span className="cf-bars" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  <div className="cf-empty-title">Nothing here yet</div>
                  <div>Hold your hotkey and start talking — dictations land here.</div>
                </div>
              ) : (
                <div>
                  {history.map((h) => (
                    <div className="cf-hrow" key={h.id}>
                      <div className="cf-hrow-main">
                        <div className="cf-hrow-text">{h.text}</div>
                        <div className="cf-hrow-meta">
                          {dayLabel(h.at)} {timeOf(h.at)} · {h.chars} chars · {h.engine}
                          {h.app ? ` · ${h.app}` : ''}
                        </div>
                      </div>
                      <CopyBtn id={h.id} text={h.text} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- SNIPPETS ---------------- */}
          {page === 'snippets' && (
            <div className="cf-screen">
              <div className="cf-head-row">
                <div>
                  <div className="cf-title">Snippets</div>
                  <div className="cf-subtitle">Say a trigger word, paste the expansion.</div>
                </div>
                <button className="cf-btn-dark" onClick={() => setAddingSnip(true)}>Add new</button>
              </div>
              {snipHero && (
                <div className="cf-hero">
                  <div className="cf-hero-title">
                    Stop <em>re-typing</em> yourself.
                  </div>
                  <div className="cf-hero-body">
                    Save text you use often — an intro, a prompt, a link — then say its name to drop it in.
                  </div>
                  <button className="cf-hero-x" title="Dismiss" onClick={() => setSnipHero(false)}>
                    <IconX />
                  </button>
                </div>
              )}
              {addingSnip && (
                <div className="cf-snip-form">
                  <input
                    className="cf-input"
                    style={{ width: 140 }}
                    placeholder="trigger"
                    value={newTrigger}
                    spellCheck={false}
                    onChange={(e) => setNewTrigger(e.target.value)}
                  />
                  <span className="cf-arrow">→</span>
                  <input
                    className="cf-input grow"
                    placeholder="expansion text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                  />
                  <button className="cf-btn-dark" onClick={saveSnippet}>Save</button>
                  <button className="cf-btn-clear" onClick={() => { setAddingSnip(false); setNewTrigger(''); setNewText('') }}>Cancel</button>
                </div>
              )}
              {snippets.length === 0 && !addingSnip ? (
                <div className="cf-empty">
                  <div className="cf-empty-title">No snippets yet</div>
                  <div>Say it once, save it forever — Add new to create your first.</div>
                </div>
              ) : (
                <div>
                  {snippets.map((s) => (
                    <div className="cf-snip-row" key={s.id}>
                      <span className="cf-snip-trigger">“{s.trigger}”</span>
                      <span className="cf-arrow">→</span>
                      <span className="cf-snip-text">{s.text}</span>
                      <CopyBtn id={`snip-${s.id}`} text={s.text} />
                      <button className="cf-icon-btn danger" title="Delete" onClick={() => delSnippet(s.id)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- SCRATCHPAD ---------------- */}
          {page === 'scratchpad' && (
            <div className="cf-screen">
              <div className="cf-scratch-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="cf-title">Scratchpad</div>
                  <span className="cf-beta">Beta</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="cf-hint" style={{ whiteSpace: 'nowrap' }}>Add to Flow Bar</span>
                  <Toggle
                    on={settings.general.scratchpadShortcut}
                    label="Add scratchpad shortcut"
                    onClick={() => update('general.scratchpadShortcut', !settings.general.scratchpadShortcut)}
                  />
                  {settings.general.scratchpadShortcut && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <kbd className="cf-kbd">Ctrl</kbd>
                      <kbd className="cf-kbd">Shift</kbd>
                      <kbd className="cf-kbd">S</kbd>
                    </span>
                  )}
                </div>
              </div>
              {scratchHero && (
                <div className="cf-hero">
                  <div className="cf-hero-title">
                    A quiet place to <em>think out loud</em>.
                  </div>
                  <div className="cf-hero-body">
                    Brain-dump with your voice, tidy it later. Notes never leave this machine.
                  </div>
                  <button className="cf-hero-cta" onClick={newNote}>Start new note</button>
                  <button className="cf-hero-x" title="Dismiss" onClick={() => setScratchHero(false)}>
                    <IconX />
                  </button>
                </div>
              )}
              {editNote && (
                <div className="cf-note-editor">
                  <textarea
                    className="cf-note-textarea"
                    autoFocus
                    placeholder="Type, or focus here and dictate with your hotkey…"
                    value={noteBody}
                    onChange={(e) => onNoteChange(e.target.value)}
                  />
                  <div className="cf-inline" style={{ justifyContent: 'flex-end' }}>
                    <button className="cf-btn-clear" onClick={() => delNote(editNote)}>Delete</button>
                    <button className="cf-btn-dark" onClick={closeEditor}>Done</button>
                  </div>
                </div>
              )}
              <div>
                <div className="cf-head-row" style={{ marginBottom: 4 }}>
                  <div className="cf-section-label">Recents</div>
                  {notes.length > 0 && <span className="cf-mono-muted">{notes.length} notes · local only</span>}
                </div>
                {notes.length === 0 ? (
                  <div className="cf-empty">
                    <div className="cf-empty-title">No notes yet</div>
                    <div>Start a note and it will live here.</div>
                  </div>
                ) : (
                  notes.map((n) => (
                    <div className="cf-note-row" key={n.id} onClick={() => openEditor(n)}>
                      <span className="cf-note-title">{n.title}</span>
                      <span className="cf-note-time">{timeOf(n.at)}</span>
                      <button
                        className="cf-icon-btn danger"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); void delNote(n.id) }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---------------- SETTINGS ---------------- */}
          {page === 'settings' && (
            <div className="cf-screen settings">
              <div>
                <div className="cf-title">Settings</div>
                <div className="cf-subtitle">Everything runs on your machine unless you pick a cloud engine.</div>
              </div>

              <div className="cf-card">
                <div className="cf-card-title">Activation</div>
                <div className="cf-field">
                  <div className="cf-field-label">Mode</div>
                  <select
                    className="cf-select"
                    value={settings.general.activationMode}
                    onChange={(e) => update('general.activationMode', e.target.value)}
                  >
                    <option value="push-to-talk">Push-to-talk</option>
                    <option value="toggle">Hands-free</option>
                  </select>
                </div>
                <div className="cf-field top cf-divided">
                  <div>
                    <div className="cf-field-label">Hotkey</div>
                    <div className="cf-field-sub">Pick at least one modifier</div>
                  </div>
                  <div className="cf-chips">
                    {MODS.map((m) => (
                      <button
                        key={m.v}
                        className={`cf-chip ${mods.includes(m.v) ? 'on' : ''}`}
                        onClick={() => toggleMod(m.v)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {mods.includes('Meta') && (
                  <div className="cf-warn">
                    <b>!</b>
                    <span>Win-key chords can trigger Windows shortcuts — keep it combined with another modifier.</span>
                  </div>
                )}
                <div className="cf-helper">
                  {isToggleMode ? 'Tap' : 'Hold'}
                  {mods.map((m) => (
                    <kbd className="cf-kbd" key={m}>{label(m)}</kbd>
                  ))}
                  {isToggleMode ? 'to start and stop.' : 'to dictate — release to finish.'}
                  <kbd className="cf-kbd">Esc</kbd>
                  cancels.
                </div>
                <div className="cf-field cf-divided">
                  <div className="cf-field-label">Launch at login</div>
                  <Toggle
                    on={settings.general.launchOnStartup}
                    label="Launch at login"
                    onClick={() => update('general.launchOnStartup', !settings.general.launchOnStartup)}
                  />
                </div>
              </div>

              <div className="cf-card">
                <div className="cf-card-title">Speech-to-text</div>
                <div className="cf-field">
                  <div className="cf-field-label">Engine</div>
                  <select
                    className="cf-select"
                    value={settings.stt.provider}
                    onChange={(e) => update('stt.provider', e.target.value)}
                  >
                    <option value="groq">Groq (cloud)</option>
                    <option value="openai">OpenAI (cloud)</option>
                    <option value="local">Local — whisper.cpp</option>
                  </select>
                </div>
                {isLocal && (
                  <div className="cf-subgroup cf-divided">
                    <div className="cf-field">
                      <div className="cf-field-label">Model</div>
                      <select
                        className="cf-select"
                        value={settings.stt.localModel}
                        onChange={(e) => {
                          setLocalMsg('')
                          void update('stt.localModel', e.target.value)
                        }}
                      >
                        <option value="ggml-tiny.en-q5_1.bin">Tiny.en — ~30 MB</option>
                        <option value="ggml-base.en-q5_1.bin">Base.en — ~60 MB</option>
                        <option value="ggml-small.en-q5_1.bin">Small.en — ~190 MB</option>
                      </select>
                    </div>
                    <div className="cf-field">
                      <div className="cf-note">
                        Engine <span className={`cf-mark ${localSt?.engine ? 'ok' : ''}`}>{localSt?.engine ? '✓' : '—'}</span>
                        {' · '}Model <span className={`cf-mark ${localSt?.model ? 'ok' : ''}`}>{localSt?.model ? '✓' : '—'}</span>
                      </div>
                      <div className="cf-inline">
                        {localMsg && <span className="cf-note">{localMsg}</span>}
                        <button className="cf-btn-dark" onClick={downloadLocal} disabled={localBusy}>
                          {downloadLabel}
                        </button>
                      </div>
                    </div>
                    <div className="cf-hint">Runs fully offline on CPU — no audio leaves this machine.</div>
                  </div>
                )}
              </div>

              <div className="cf-card">
                <div className="cf-card-title">AI formatting</div>
                <div className="cf-field">
                  <div>
                    <div className="cf-field-label">Clean up transcript</div>
                    <div className="cf-field-sub">Punctuation, fillers, lists</div>
                  </div>
                  <Toggle
                    on={settings.llm.enabled}
                    label="Clean up transcript"
                    onClick={() => update('llm.enabled', !settings.llm.enabled)}
                  />
                </div>
                {settings.llm.enabled && (
                  <div className="cf-field cf-divided">
                    <div className="cf-field-label">Cleanup model</div>
                    <select
                      className="cf-select"
                      value={settings.llm.provider}
                      onChange={(e) => update('llm.provider', e.target.value)}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="groq">Groq</option>
                      <option value="ollama">Ollama (local)</option>
                    </select>
                  </div>
                )}
                {settings.llm.enabled && settings.llm.provider === 'ollama' && (
                  <div className="cf-subgroup cf-divided">
                    <div className="cf-field">
                      <div className="cf-field-label">Model</div>
                      <input
                        className="cf-input"
                        value={settings.llm.ollamaModel}
                        spellCheck={false}
                        placeholder="llama3.2"
                        onChange={(e) => update('llm.ollamaModel', e.target.value)}
                      />
                    </div>
                    <div className="cf-field">
                      <div className="cf-field-label">Endpoint</div>
                      <input
                        className="cf-input"
                        value={settings.llm.ollamaEndpoint}
                        spellCheck={false}
                        placeholder="http://localhost:11434"
                        onChange={(e) => update('llm.ollamaEndpoint', e.target.value)}
                      />
                    </div>
                    <div className="cf-inline">
                      <button className="cf-btn-ghost" onClick={testOllama}>Test Ollama</button>
                      {ollamaMsg && <span className="cf-note">{ollamaMsg}</span>}
                    </div>
                    <div className="cf-hint">
                      First time? Run <code className="cf-code">ollama pull {settings.llm.ollamaModel || 'llama3.2'}</code> in a terminal.
                    </div>
                  </div>
                )}
              </div>

              <div className="cf-card">
                <div className="cf-card-title">Connections</div>
                <KeyRow name="groq" label="Groq API key" placeholder="gsk_…" stored={settings.secretNames.includes('groq')} onChanged={refresh} />
                <KeyRow name="openai" label="OpenAI API key" placeholder="sk-…" stored={settings.secretNames.includes('openai')} onChanged={refresh} />
                <div className="cf-hint">Keys are encrypted in the OS keystore — never written to disk in plain text.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
