import { useCallback, useEffect, useState } from 'react'

interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  platform: string
  encryptionAvailable: boolean
}

interface PublicSettings {
  general: { launchOnStartup: boolean; activationMode: string }
  hotkey: { pttModifiers: string[] }
  stt: { provider: 'groq' | 'openai'; groqModel: string; openaiModel: string; language: string }
  llm: { enabled: boolean; provider: 'openai' | 'groq'; openaiModel: string; groqModel: string }
  secretNames: string[]
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

function KeyRow(props: { name: string; label: string; hint: string; stored: boolean; onChanged: () => void }) {
  const { name, label, hint, stored, onChanged } = props
  const [val, setVal] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!val.trim()) return
    await window.codeflow.setSecret(name, val.trim())
    setVal('')
    setMsg('Saved — encrypted with the OS keystore.')
    onChanged()
  }
  const test = async () => {
    setBusy(true)
    setMsg('Testing…')
    const r = await window.codeflow.testProvider(name)
    setMsg(r.message)
    setBusy(false)
  }
  const clear = async () => {
    await window.codeflow.clearSecret(name)
    setMsg('Cleared.')
    onChanged()
  }

  return (
    <div className="keyrow">
      <div className="keyrow-head">
        <strong>{label}</strong>
        <span className={stored ? 'ok' : 'muted'}>{stored ? '● stored' : '○ not set'}</span>
      </div>
      <div className="row">
        <input
          type="password"
          placeholder={stored ? '•••••••• (stored)' : hint}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button className="primary" onClick={save} disabled={!val.trim()}>Save</button>
        <button onClick={test} disabled={!stored || busy}>Test</button>
        <button onClick={clear} disabled={!stored}>Clear</button>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </div>
  )
}

export default function App() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [status, setStatus] = useState<StatusPayload>({ state: 'idle' })

  const refresh = useCallback(async () => {
    setInfo(await window.codeflow.getAppInfo())
    setSettings(await window.codeflow.getSettings())
  }, [])

  useEffect(() => {
    refresh()
    const off = window.codeflow.onStatus(setStatus)
    return off
  }, [refresh])

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

  const chord = settings.hotkey.pttModifiers.join(' + ')

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

      <section className="card how">
        <h2>How to dictate</h2>
        <p>
          Hold <kbd>{chord.split(' + ')[0] || 'Ctrl'}</kbd> + <kbd>{chord.split(' + ')[1] || 'Alt'}</kbd>,
          speak, then release. Press <kbd>Esc</kbd> to cancel. The cleaned text is pasted into whatever
          app has focus.
        </p>
        {!settings.secretNames.includes('groq') && !settings.secretNames.includes('openai') && (
          <p className="warn">⚠ Add an API key below before your first dictation.</p>
        )}
      </section>

      <section className="card">
        <h2>API keys</h2>
        <p className="muted">
          Stored encrypted via <code>safeStorage</code> — only ciphertext is written to disk.
        </p>
        <KeyRow
          name="groq"
          label="Groq"
          hint="gsk_… — speech-to-text (fast & cheap)"
          stored={settings.secretNames.includes('groq')}
          onChanged={refresh}
        />
        <KeyRow
          name="openai"
          label="OpenAI"
          hint="sk-… — GPT cleanup (and optional STT)"
          stored={settings.secretNames.includes('openai')}
          onChanged={refresh}
        />
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
          <input
            type="checkbox"
            checked={settings.llm.enabled}
            onChange={(e) => update('llm.enabled', e.target.checked)}
          />
          <span>AI formatting — clean up the transcript (punctuation, filler removal, lists)</span>
        </label>

        {settings.llm.enabled && (
          <label className="field">
            <span>Cleanup model</span>
            <select value={settings.llm.provider} onChange={(e) => update('llm.provider', e.target.value)}>
              <option value="openai">OpenAI — gpt-4o-mini</option>
              <option value="groq">Groq — llama-3.3-70b</option>
            </select>
          </label>
        )}
      </section>

      <footer className="footer">
        {info.name} v{info.version} · Electron {info.electron} · {info.platform} · OS encryption{' '}
        {info.encryptionAvailable ? 'available' : 'unavailable'} · lives in the system tray
      </footer>
    </div>
  )
}
