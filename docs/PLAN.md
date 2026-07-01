# CodeFlow — Implementation Plan

> A Windows-native, AI voice-dictation application: press a hotkey, speak, and clean
> formatted text is typed into **whatever app is focused**. A functional remake of
> [Wispr Flow](https://wisprflow.ai), runnable locally with **either local models or cloud API keys**.

_Last updated: 2026-07-01 · Status: Planning_

---

## 1. Product vision

CodeFlow is a background desktop app (system-tray) that turns speech into polished, context-aware
text anywhere on Windows. The differentiator versus generic dictation is the **AI formatting layer**
(filler removal, punctuation, self-correction, tone adaptation) and **universal text injection** into
any focused field.

**Non-negotiable design constraint:** every AI stage (speech-to-text and LLM cleanup) must run through
a **provider abstraction** so the user can pick **local models** (offline, private, $0 marginal cost)
**or cloud API keys** (fastest, highest accuracy) — switchable in settings without code changes.

---

## 2. Functional specification (grounded in Wispr Flow teardown)

### MVP — must-have
- **Tray app** always running; global hotkey works from anywhere.
- **Activation modes:** push-to-talk (hold), toggle / hands-free (double-tap or dedicated key), `Esc` to cancel. Rebindable, requires ≥1 modifier.
- **Flow Bar overlay:** small pill anchored bottom-center in a transparent, always-on-top window; states = listening/waveform, processing, error.
- **Core pipeline:** capture mic → STT → **AI formatting** (strip "um/uh", auto punctuation + capitalization, numbered/bulleted lists) → inject into focused field via **clipboard-paste primary + keystroke fallback**; if injection can't be verified, copy to clipboard and notify (never lose dictation).
- **Backtrack / self-editing:** "…meet at 2, actually 3" / "scratch that" rewrites using full-utterance context.
- **App-context tone:** casual (drop trailing period) in chat apps, formal in mail/docs.
- **Custom dictionary + snippets** (voice shortcut → canned text); **transcript history** list.
- **Settings:** mic device, language, hotkeys, writing style, provider + API keys; **privacy / no-store** toggle.
- English + a few major languages.

### v2 — later
- **Command Mode:** select text + speak instruction ("make more assertive", "summarize to 3 bullets", "translate to French") → rewrite in place; no selection → generate at cursor.
- 100+ languages, auto-detect, code-switching (e.g. Hinglish).
- Code-syntax awareness (camelCase/snake_case, filename tagging in editors).
- Streaming STT for sub-second latency; cross-device sync + accounts; Teams shared dictionary; SSO/HIPAA.
- Mouse-button triggers, style/transform presets, scratchpad, view-diff.

---

## 3. Tech stack decision

**Chosen: Electron + TypeScript (React UI).** Pure JS/TS end-to-end, fastest UI iteration, with mature native modules covering the OS-level needs (global hold-to-talk, text injection, active-window detection).

**Why Electron**
- **One language across the whole app** — main process, renderer UI, and provider layer are all TypeScript; no Rust.
- **Capabilities covered by mature native modules:** `uiohook-napi` (global key-down/up for true hold-to-talk), `@nut-tree-fork/nut-js` (Unicode keystrokes + paste), `active-win` (focus snapshot + app-context tone), Electron `safeStorage` (DPAPI-backed API-key encryption).
- **Fastest UI iteration** — settings/onboarding/history/overlay are all web UI with the full React ecosystem and hot reload.
- **Mature distribution** — `electron-builder` → NSIS installer, `electron-updater` for auto-update.

**Trade-off accepted:** heavier runtime (~150 MB, higher idle RAM) and slightly higher latency than a native core. Mitigations: keep the always-on hot path (hotkey listener + audio) lean, run STT/LLM off the UI thread (utility process/worker), and lazy-load renderer windows.

**Runner-up:** Tauri v2 (Rust core + web UI) — smaller/faster footprint, but requires Rust in the native core. **Fastest throwaway spike:** Python (WhisperWriter-style: `pynput` + `sounddevice` + `faster-whisper` + `pywin32`).

**Recommended packages**
- Hotkey / PTT hold: **`uiohook-napi`** (global keydown/keyup — `globalShortcut` alone can't detect hold).
- Mic capture: renderer **Web Audio / `getUserMedia`** → downsample to 16 kHz PCM (native `naudiodon` fallback).
- Local STT: **`nodejs-whisper`** / `smart-whisper` (whisper.cpp, GGUF) — model `large-v3-turbo`.
- Cloud STT + LLM: **`undici`/fetch**, **`@anthropic-ai/sdk`**, **`openai`**, Ollama via HTTP.
- Text injection: Electron **`clipboard`** + **`@nut-tree-fork/nut-js`** (Ctrl+V paste primary; Unicode keystroke fallback).
- Active window / context: **`active-win`**.
- Tray + overlay: Electron **`Tray`** + frameless transparent always-on-top **`BrowserWindow`** (`skipTaskbar`, `focusable:false`).
- Settings: **`electron-store`**; **API keys encrypted via Electron `safeStorage`** (Windows DPAPI — never plaintext).
- History: **`better-sqlite3`** · Autostart: `app.setLoginItemSettings` · Packaging: **`electron-builder`** (NSIS) + **`electron-updater`**.

---

## 4. Architecture

### Core pipeline (the whole product in one line)
```
global hotkey (hold/toggle)
  → snapshot focused window  → mic capture @16kHz → VAD/trim
  → SttEngine.transcribe()    (local whisper-rs OR cloud API)
  → LlmEngine.clean()         (formatting/backtrack/tone; local Ollama OR cloud)
  → apply dictionary + snippets
  → inject into snapshotted window  (clipboard paste → keystroke fallback → clipboard-copy notify)
  → save to history
Flow Bar overlay reflects each state; Esc aborts at any point.
```

### Provider abstraction (the key extensibility seam)
```ts
interface SttEngine {
  transcribe(audio: Pcm16, opts: SttOpts): Promise<Transcript>;
  transcribeStream?(audio: AsyncIterable<Pcm16>): AsyncIterable<PartialTranscript>;
  capabilities(): SttCaps; // streaming, languages, diarization
}
interface LlmEngine {
  clean(raw: string, prompt: Prompt, opts: LlmOpts): Promise<string>;
  cleanStream?(raw: string, prompt: Prompt, opts: LlmOpts): AsyncIterable<string>;
}
```
- **STT impls:** `LocalWhisper` (nodejs-whisper, model `large-v3-turbo`), `Groq`, `OpenAI` (`gpt-4o-transcribe`), `Deepgram` (Nova-3, streaming).
- **LLM impls:** `Ollama` (Qwen2.5 7B / Llama 3.2 3B), `Anthropic` (Haiku 4.5 default, Sonnet 4.6 premium), `OpenAI` (gpt-4o-mini).
- A `ProviderFactory` builds the impl from settings. Each config section: `provider`, `mode` (local|cloud), `apiKey` (encrypted via `safeStorage` — never plaintext), `endpoint`/`baseUrl`, `model`, `language`, `device` (cpu|cuda), `computeType` (int8|fp16), plus LLM `temperature`/`maxTokens`/`systemPrompt`. Every provider exposes **"test connection."**

### Recommended defaults
| Profile | STT | LLM cleanup | Notes |
|---|---|---|---|
| **Privacy / offline-first** | Local `whisper.cpp large-v3-turbo` | Ollama `Qwen2.5 7B` (fallback `Llama 3.2 3B`) | Zero data leaves device, $0/mo |
| **Speed / accuracy-first** | Groq `whisper-large-v3-turbo` (~$0.04/hr) or Deepgram Nova-3 (streaming) | Claude `Haiku 4.5` (Sonnet 4.6 premium) | ~$3–13/mo for a heavy user (~2 hr/day) |

### Proposed repo structure
```
CodeFlow/
├─ src/
│  ├─ main/                   # Electron main process
│  │  ├─ hotkey/  audio/  stt/  llm/  inject/  pipeline/
│  │  ├─ settings/  overlay/  history/  window/  ipc/  index.ts
│  ├─ preload/                # contextBridge APIs (renderer ↔ main)
│  └─ renderer/               # React UI
│     ├─ overlay/  settings/  onboarding/  history/
├─ models/                    # downloaded GGUF (gitignored)
├─ docs/PLAN.md
└─ electron-builder.yml  package.json  tsconfig.json  README.md
```

---

## 5. Milestones

**Phase 0 — Foundations** · Electron + TS app boots (Vite + electron-builder); tray icon + quit; `electron-store` settings; `safeStorage` key encryption wired; CI (build + typecheck + lint). _Exit: app runs in tray on Windows._

**Phase 1 — Core dictation loop (the "it works" milestone)** · `uiohook-napi` hotkey PTT + toggle + `Esc`; Web Audio capture → 16 kHz; **cloud STT (Groq default)**; inject via clipboard-paste + `nut.js` keystroke fallback with `active-win` focus snapshot + clipboard save/restore; Flow Bar overlay states. _Exit: hold key, speak, text appears in Notepad/Chrome/VS Code._

**Phase 2 — Provider abstraction + local models** · `SttEngine`/`LlmEngine` interfaces; `LocalWhisper` (nodejs-whisper) + Ollama; settings UI to pick provider, enter/store API keys, download models, test connection; CPU/GPU detection. _Exit: switch local↔cloud from the UI with no restart._

**Phase 3 — AI formatting layer** · LLM cleanup prompt (filler removal, punctuation, capitalization, lists); backtrack self-correction; app-context tone (foreground-app detection → formal/casual); custom dictionary + snippet expansion. _Exit: raw transcript → clean, correctly-formatted output._

**Phase 4 — Product polish** · Transcript history (SQLite) + UI; onboarding (mic/permission grants, provider pick); rebindable-hotkey UI; writing-style settings; autostart on login; robust error/permission/latency handling. _Exit: a daily-driver a non-technical user can set up._

**Phase 5 — v2 / stretch** · Command Mode; 100+ languages + auto-detect; streaming STT (Deepgram/gpt-4o-transcribe); code-syntax awareness; updater + code-signing + MSI/NSIS installer; optional accounts/sync.

---

## 6. Risks & mitigations (Windows specifics)
- **UAC / UIPI:** injection is silently blocked in elevated windows (elevated terminal, Task Manager). → Detect failure, fall back to clipboard-copy + notify; offer an optional "run elevated" mode.
- **Injection reliability:** keystroke sim is dropped by fast/secure fields & games. → Clipboard paste primary; **save & restore the user's clipboard** around it.
- **Unicode / emoji:** raw VK events mangle non-ASCII. → `KEYEVENTF_UNICODE` / paste path; verify emoji.
- **Focus drift:** async STT means focus can move. → Snapshot foreground window at record-start; target that, not "where you're looking now."
- **Hotkey conflicts:** `RegisterHotKey` fails silently. → Use `rdev` low-level hook; handle modifiers carefully.
- **IME (CJK):** injecting mid-composition corrupts input. → Commit/bypass composition string.
- **Local model weight:** large downloads / GPU variance. → Don't bundle models; download on first run with progress; detect CUDA and fall back to CPU (`int8`).
- **API-key safety:** → encrypt via Electron `safeStorage` (Windows DPAPI), never plaintext in settings.json.

## 7. Testing
- Unit tests for pipeline + each provider (mock `SttEngine`/`LlmEngine`).
- Injection integration harness against a controlled test window (ASCII, Unicode, emoji, multiline).
- Manual QA matrix: Notepad, Chrome, VS Code, Slack, Word, elevated terminal.
- Latency benchmarks per provider (record→text) to guard the "~1–2 s" target.

## 8. Distribution
- `electron-builder` → **NSIS** installer; optional code-signing.
- Auto-update via `electron-updater`.
- Models fetched post-install (keeps installer small).

---

## 9. Immediate next steps
1. ✅ **Stack confirmed: Electron + TypeScript (React UI).**
2. Scaffold Phase 0 (Electron + TS app + tray + settings store) and commit to `main`.
3. Decide the **default out-of-box provider** for first run (recommend: prompt at onboarding — "Local & private" vs "Cloud & fast" — with Groq + Claude Haiku 4.5 as the cloud default, whisper.cpp + Ollama as the local default).

_Model IDs/pricing to be re-verified against the Claude API reference at implementation time (Haiku 4.5 `claude-haiku-4-5`, Sonnet 4.6 `claude-sonnet-4-6`)._
