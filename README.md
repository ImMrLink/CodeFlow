# CodeFlow

A Windows-native, AI voice-dictation app — press a hotkey, speak, and clean, formatted text is
typed into whatever app is focused. A functional remake of [Wispr Flow](https://wisprflow.ai),
runnable with **either local models or cloud API keys**.

- 🎙️ Global push-to-talk / hands-free dictation from any app
- ✨ AI formatting: filler removal, punctuation, self-correction, context-aware tone
- ⌨️ Universal text injection (clipboard-paste primary, keystroke fallback)
- 🔒 Your choice: 100% local (whisper.cpp + Ollama) or cloud (Groq/OpenAI/Deepgram + Claude)

## Status

🚧 **Phase 0 — foundation.** The Electron + TypeScript app boots to the system tray, with an
`electron-store` settings layer and API keys encrypted via the OS keystore (`safeStorage` / Windows
DPAPI). See the full roadmap in [`docs/PLAN.md`](docs/PLAN.md).

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
