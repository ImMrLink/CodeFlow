# CodeFlow

A Windows-native, AI voice-dictation app — press a hotkey, speak, and clean, formatted text is
typed into whatever app is focused. A functional remake of [Wispr Flow](https://wisprflow.ai),
runnable with **either local models or cloud API keys**.

- 🎙️ Global push-to-talk / hands-free dictation from any app
- ✨ AI formatting: filler removal, punctuation, self-correction, context-aware tone
- ⌨️ Universal text injection (clipboard-paste primary, keystroke fallback)
- 🔒 Your choice: 100% local (whisper.cpp + Ollama) or cloud (Groq/OpenAI/Deepgram + Claude)

## Status

🚧 **Phase 1 — dictation loop (cloud).** Hold **Ctrl + Alt**, speak, release: CodeFlow records the
mic, transcribes via **Groq** (or OpenAI), optionally cleans the text with **GPT**, and pastes it into
the focused app. A bottom-center overlay shows listening/transcribing state; `Esc` cancels. Providers
and API keys are set in Settings (keys encrypted via `safeStorage` / Windows DPAPI). See the roadmap
in [`docs/PLAN.md`](docs/PLAN.md).

### Using it

1. `npm run dev`, then open **Settings** from the tray icon.
2. Paste a **Groq** API key (speech-to-text) and, for cleanup, an **OpenAI** key. Hit **Test**.
3. Focus any text field, **hold Ctrl + Alt**, speak, and release. The text is pasted in.

> Windows must allow microphone access for desktop apps (Settings → Privacy & security → Microphone).

> **Troubleshooting:** after changing main-process code, fully restart (`npm run dev`) — a stale instance
> won't pick up new hotkey/pipeline logic. For verbose diagnostics set `CODEFLOW_DEBUG=1` before launching;
> it writes a step-by-step log to `%TEMP%\codeflow-debug.log` (off by default; never logs typed content).

## Stack

Electron + TypeScript (React UI), built with `electron-vite`. See the plan for rationale,
architecture, the STT/LLM provider abstraction, milestones, and risks.

## Development

Prerequisites: Node.js 20+ (developed on 26) and Windows 10/11.

```bash
npm install        # install dependencies (also downloads the Electron binary)
npm run dev        # launch with hot reload
npm run typecheck  # TypeScript checks
npm run build      # production build into out/
npm run gen-icon   # regenerate tray/app icons into resources/
npm run package    # build a Windows NSIS installer into release/
```

The app lives in the **system tray**. Closing the window hides it; use the tray icon to reopen
or quit.

## Project layout

```
src/
  main/       Electron main process (tray, windows, IPC, settings)
  preload/    contextBridge API exposed to the renderer
  renderer/   React UI (settings today; overlay/onboarding/history later)
scripts/      icon generator
resources/    generated app/tray icons
docs/PLAN.md  implementation plan & roadmap
```
