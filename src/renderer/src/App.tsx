import { useEffect, useState } from 'react'

interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  chrome: string
  platform: string
  encryptionAvailable: boolean
}

interface PublicSettings {
  general: { launchOnStartup: boolean; activationMode: string }
  providers: { stt: string; llm: string }
  secretNames: string[]
}

const SECRET_NAME = 'anthropic'

export default function App() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [keyStored, setKeyStored] = useState(false)
  const [status, setStatus] = useState<string>('')

  async function refresh() {
    setInfo(await window.codeflow.getAppInfo())
    setSettings(await window.codeflow.getSettings())
    const s = await window.codeflow.getSecretStatus(SECRET_NAME)
    setKeyStored(s.exists)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function saveKey() {
    if (!apiKey.trim()) return
    try {
      await window.codeflow.setSecret(SECRET_NAME, apiKey.trim())
      setApiKey('')
      setStatus('Saved — encrypted with the OS keystore (DPAPI).')
      await refresh()
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    }
  }

  async function clearKey() {
    await window.codeflow.clearSecret(SECRET_NAME)
    setStatus('Cleared.')
    await refresh()
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
          <p className="tagline">AI voice dictation for Windows — Phase 0 foundation</p>
        </div>
      </header>

      <section className="card">
        <h2>Environment</h2>
        {info ? (
          <dl className="grid">
            <div><dt>App</dt><dd>{info.name} v{info.version}</dd></div>
            <div><dt>Platform</dt><dd>{info.platform}</dd></div>
            <div><dt>Electron</dt><dd>{info.electron}</dd></div>
            <div><dt>Chromium</dt><dd>{info.chrome}</dd></div>
            <div><dt>Node</dt><dd>{info.node}</dd></div>
            <div>
              <dt>OS encryption</dt>
              <dd className={info.encryptionAvailable ? 'ok' : 'warn'}>
                {info.encryptionAvailable ? 'available' : 'unavailable'}
              </dd>
            </div>
          </dl>
        ) : (
          <p>Loading…</p>
        )}
      </section>

      <section className="card">
        <h2>Provider API key</h2>
        <p className="muted">
          Stored encrypted via <code>safeStorage</code> — only the ciphertext is written to disk.
          This proves the secure-settings path works end to end.
        </p>
        <div className="row">
          <input
            type="password"
            placeholder={keyStored ? '•••••••• (a key is stored)' : 'Paste an Anthropic API key'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button className="primary" onClick={saveKey} disabled={!apiKey.trim()}>Save</button>
          <button onClick={clearKey} disabled={!keyStored}>Clear</button>
        </div>
        <p className="state">
          Status: <strong className={keyStored ? 'ok' : 'muted'}>{keyStored ? 'key stored' : 'no key stored'}</strong>
          {status && <span className="hint"> — {status}</span>}
        </p>
      </section>

      <section className="card">
        <h2>Current settings</h2>
        {settings ? (
          <pre>{JSON.stringify(settings, null, 2)}</pre>
        ) : (
          <p>Loading…</p>
        )}
      </section>

      <footer className="footer">
        Runs in the system tray. Close this window and it hides; use the tray icon to reopen or quit.
      </footer>
    </div>
  )
}
