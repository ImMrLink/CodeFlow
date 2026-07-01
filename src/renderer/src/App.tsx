import { useCallback, useEffect, useState } from 'react'

interface AppInfo {
  name: string
  version: string
  electron: string
  platform: string
  encryptionAvailable: boolean
}

interface PublicSettings {
  general: { launchOnStartup: boolean; activationMode: string }
  hotkey: { pttModifiers: string[] }
  stt: { provider: 'groq' | 'openai'; groqModel: string; openaiModel: string; language: string }
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
  engine: string
}

type StatusPayload = { state: string; message?: string }

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  listening: 'Listening…',
  transcribing: 'Transcribing…',
  formatting: 'Formatting…',
  injecting: 'Pasting…',
  done: 'Done',
  error: 'Error'
}

const MODS = [
  { v: 'Ctrl', label: 'Ctrl' },
  { v: 'Alt', label: 'Alt' },
  { v: 'Shift', label: 'Shift' },
  { v: 'Meta', label: 'Win' }
]

const label = (m: string) => (m === 'Meta' ? 'Win' : m)

function KeyRow(props: { name: string; label: string; hint: string; stored: boolean; onChanged: () => void }) {
  const [val, setVal] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!val.trim()) return
    await window.codeflow.setSecret(props.name, val.trim())
    setVal('')
    setMsg('Saved — encrypted with the OS keystore.')
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
    setMsg('Cleared.')
    props.onChanged()
  }

  return (
    <div className="keyrow">
      <div className="keyrow-head">
        <strong>{props.label}</strong>
        <span className={props.stored ? 'ok' : 'muted'}>{props.stored ? '● stored' : '○ not set'}</span>
      </div>
      <div className="row">
        <input
          type="password"
          placeholder={props.stored ? '•••••••• (stored)' : props.hint}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button className="primary" onClick={save} disabled={!val.trim()}>Save</button>
        <button onClick={test} disabled={!props.stored || busy}>Test</button>
        <button onClick={clear} disabled={!props.stored}>Clear</button>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </div>
  )
}

export default function App() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [status, setStatus] = useState<StatusPayload>({ state: 'idle' })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [ollamaMsg, setOllamaMsg] = useState('')

  const loadHistory = useCallback(async () => {
    setHistory(await window.codeflow.getHistory())
  }, [])

  const refresh = useCallback(async () => {
    setInfo(await window.codeflow.getAppInfo())
    setSettings(await window.codeflow.getSettings())
    await loadHistory()
  }, [loadHistory])

  useEffect(() => {
    refresh()
    const off = window.codeflow.onStatus((s) => {
      setStatus(s)
      if (s.state === 'done') void loadHistory()
    })
    return off
  }, [refresh, loadHistory])

  const update = async (key: string, value: unknown) => {
    setSettings(await window.codeflow.setSetting(key, value))
  }

  if (!settings || !info) {
    return (
      <div className="app">
        <p>Loading…</p>
      </div>
    )
  }

  const mods = settings.hotkey.pttModifiers
  const chord = mods.map(label).join(' + ')
  const isToggle = settings.general.activationMode === 'toggle'

  const toggleMod = (v: string) => {
    const next = mods.includes(v) ? mods.filter((x) => x !== v) : [...mods, v]
    if (next.length === 0) return // keep at least one modifier
    void update('hotkey.pttModifiers', next)
  }

  const copy = (text: string) => void window.codeflow.copyText(text)
  const clearHist = async () => setHistory(await window.codeflow.clearHistory())
  const testOllama = async () => {
    setOllamaMsg('Testing…')
    const r = await window.codeflow.testProvider('ollama')
    setOllamaMsg(r.message)
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="logo" aria-hidden>
          <span className="bar" />
          <span className="bar tall" />
          <span className="bar" />
          <span className="bar tall" />
        </div>
        <div>
          <h1>CodeFlow</h1>
          <p className="tagline">Hold to talk — it types what you say, anywhere.</p>
        </div>
        <div className={`status ${status.state}`}>
          <span className="dot" />
          {STATUS_LABEL[status.state] ?? status.state}
        </div>
      </header>

      <section className="card">
        <h2>Activation</h2>
        <label className="field">
          <span>Mode</span>
          <select
            value={settings.general.activationMode}
            onChange={(e) => update('general.activationMode', e.target.value)}
          >
            <option value="push-to-talk">Push-to-talk (hold the keys)</option>
            <option value="toggle">Hands-free (press to start, press to stop)</option>
          </select>
        </label>

        <div className="field">
          <span>Hotkey</span>
          <div className="chips">
            {MODS.map((m) => (
              <button
                key={m.v}
                className={`chip ${mods.includes(m.v) ? 'on' : ''}`}
                onClick={() => toggleMod(m.v)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className="how">
          {isToggle ? (
            <>Press <kbd>{chord}</kbd> to start, press again to stop.</>
          ) : (
            <>Hold <kbd>{chord}</kbd>, speak, then release.</>
          )}{' '}
          <kbd>Esc</kbd> cancels. Text is pasted into the focused app.
        </p>
        {mods.includes('Meta') && (
          <p className="warn">⚠ The Win key can trigger the Start menu — Ctrl/Alt/Shift combos are safer.</p>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={settings.general.launchOnStartup}
            onChange={(e) => update('general.launchOnStartup', e.target.checked)}
          />
          <span>Launch CodeFlow at login <span className="muted">(applies to the installed app)</span></span>
        </label>
      </section>

      <section className="card">
        <h2>API keys</h2>
        <p className="muted">
          Stored encrypted via <code>safeStorage</code> — only ciphertext is written to disk.
        </p>
        <KeyRow name="groq" label="Groq" hint="gsk_… — speech-to-text (fast & cheap)" stored={settings.secretNames.includes('groq')} onChanged={refresh} />
        <KeyRow name="openai" label="OpenAI" hint="sk-… — GPT cleanup (and optional STT)" stored={settings.secretNames.includes('openai')} onChanged={refresh} />
      </section>

      <section className="card">
        <h2>Engines</h2>
        <label className="field">
          <span>Speech-to-text</span>
          <select value={settings.stt.provider} onChange={(e) => update('stt.provider', e.target.value)}>
            <option value="groq">Groq — whisper-large-v3-turbo (fast, cheap)</option>
            <option value="openai">OpenAI — gpt-4o-transcribe</option>
          </select>
        </label>

        <label className="check">
          <input type="checkbox" checked={settings.llm.enabled} onChange={(e) => update('llm.enabled', e.target.checked)} />
          <span>AI formatting — clean up the transcript (punctuation, filler removal, lists)</span>
        </label>

        {settings.llm.enabled && (
          <label className="field">
            <span>Cleanup model</span>
            <select value={settings.llm.provider} onChange={(e) => update('llm.provider', e.target.value)}>
              <option value="openai">OpenAI — gpt-4o-mini (cloud)</option>
              <option value="groq">Groq — llama-3.3-70b (cloud)</option>
              <option value="ollama">Ollama — local (offline, no key)</option>
            </select>
          </label>
        )}

        {settings.llm.enabled && settings.llm.provider === 'ollama' && (
          <div className="subfields">
            <label className="field">
              <span>Ollama model</span>
              <input
                type="text"
                value={settings.llm.ollamaModel}
                onChange={(e) => update('llm.ollamaModel', e.target.value)}
                placeholder="llama3.2"
              />
            </label>
            <label className="field">
              <span>Ollama endpoint</span>
              <input
                type="text"
                value={settings.llm.ollamaEndpoint}
                onChange={(e) => update('llm.ollamaEndpoint', e.target.value)}
                placeholder="http://localhost:11434"
              />
            </label>
            <div className="row">
              <button onClick={testOllama}>Test Ollama</button>
              {ollamaMsg && <span className="hint">{ollamaMsg}</span>}
            </div>
            <p className="hint">
              Runs fully offline. Install Ollama, then pull a model: <code>ollama pull {settings.llm.ollamaModel || 'llama3.2'}</code>
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>History</h2>
          {history.length > 0 && (
            <button className="link" onClick={clearHist}>Clear all</button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="muted">No dictations yet.</p>
        ) : (
          <ul className="history">
            {history.map((h) => (
              <li key={h.id}>
                <div className="h-text">{h.text}</div>
                <div className="h-meta">
                  <span>
                    {new Date(h.at).toLocaleTimeString()} · {h.chars} chars
                  </span>
                  <button onClick={() => copy(h.text)}>Copy</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="footer">
        {info.name} v{info.version} · Electron {info.electron} · {info.platform} · OS encryption{' '}
        {info.encryptionAvailable ? 'available' : 'unavailable'} · lives in the system tray
      </footer>
    </div>
  )
}
