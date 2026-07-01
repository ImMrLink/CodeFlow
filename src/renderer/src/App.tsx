import { useCallback, useEffect, useState } from 'react'
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
  IconHelp,
  IconCopy,
  IconX
} from './icons'

interface PublicSettings {
  general: { launchOnStartup: boolean; activationMode: string }
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
}

type StatusPayload = { state: string; message?: string }
type LocalStatus = { engine: boolean; model: boolean }
type Page = 'home' | 'history' | 'settings'

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
  const [, setStatus] = useState<StatusPayload>({ state: 'idle' })
  const [page, setPage] = useState<Page>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [localSt, setLocalSt] = useState<LocalStatus | null>(null)
  const [localMsg, setLocalMsg] = useState('')
  const [localBusy, setLocalBusy] = useState(false)
  const [ollamaMsg, setOllamaMsg] = useState('')

  const loadHistory = useCallback(async () => {
    setHistory(await window.codeflow.getHistory())
  }, [])

  const refresh = useCallback(async () => {
    setSettings(await window.codeflow.getSettings())
    await loadHistory()
  }, [loadHistory])

  useEffect(() => {
    refresh()
    const off = window.codeflow.onStatus((s) => {
      setStatus(s)
      if (s.state === 'done') void loadHistory()
    })
    const offLocal = window.codeflow.onLocalProgress((m) => setLocalMsg(m))
    const offMax = window.codeflow.onMaximizeChange(setMaximized)
    return () => {
      off()
      offLocal()
      offMax()
    }
  }, [refresh, loadHistory])

  // Follow the OS light/dark preference.
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

  // Which stored keys are required by the current engine choices but missing.
  const need = new Set<string>()
  if (settings.stt.provider !== 'local' && !settings.secretNames.includes(settings.stt.provider))
    need.add(settings.stt.provider)
  if (settings.llm.enabled && settings.llm.provider !== 'ollama' && !settings.secretNames.includes(settings.llm.provider))
    need.add(settings.llm.provider)
  const pendingCount = need.size

  const totalWords = history.reduce((a, h) => a + (h.words || 0), 0)
  const totalMs = history.reduce((a, h) => a + (h.ms || 0), 0)
  const wpm = totalMs > 0 ? Math.round(totalWords / (totalMs / 60000)) : null
  const streak = computeStreak(history)
  const todayRows = history.filter((h) => dayLabel(h.at) === 'Today').slice(0, 4)

  const copyRow = (id: string, text: string) => {
    void window.codeflow.copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1300)
  }

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

  const CopyBtn = ({ id, text }: { id: string; text: string }) =>
    copiedId === id ? (
      <span className="cf-copied">Copied</span>
    ) : (
      <button className="cf-icon-btn" title="Copy" onClick={() => copyRow(id, text)}>
        <IconCopy />
      </button>
    )

  return (
    <div className="cf-app">
      {/* title bar */}
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
        {/* sidebar */}
        <div className={`cf-sidebar ${collapsed ? 'collapsed' : ''}`}>
          <div className="cf-brand">
            <span className="cf-bars" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="cf-wordmark">CODEFLOW</span>
            <span className="cf-badge-plan">Free</span>
          </div>
          <button className={`cf-nav ${page === 'home' ? 'is-active' : ''}`} onClick={() => setPage('home')}>
            <IconHome />
            Home
          </button>
          <button className={`cf-nav ${page === 'history' ? 'is-active' : ''}`} onClick={() => setPage('history')}>
            <IconHistory />
            History
          </button>
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

        {/* content panel */}
        <div className="cf-panel">
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
                        </div>
                      </div>
                      <CopyBtn id={h.id} text={h.text} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {page === 'settings' && (
            <div className="cf-screen settings">
              <div>
                <div className="cf-title">Settings</div>
                <div className="cf-subtitle">Everything runs on your machine unless you pick a cloud engine.</div>
              </div>

              {/* Activation */}
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

              {/* Speech-to-text */}
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

              {/* AI formatting */}
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

              {/* Connections */}
              <div className="cf-card">
                <div className="cf-card-title">Connections</div>
                <KeyRow
                  name="groq"
                  label="Groq API key"
                  placeholder="gsk_…"
                  stored={settings.secretNames.includes('groq')}
                  onChanged={refresh}
                />
                <KeyRow
                  name="openai"
                  label="OpenAI API key"
                  placeholder="sk-…"
                  stored={settings.secretNames.includes('openai')}
                  onChanged={refresh}
                />
                <div className="cf-hint">Keys are encrypted in the OS keystore — never written to disk in plain text.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
