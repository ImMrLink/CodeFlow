# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CodeFlow is a Windows-only Electron + TypeScript voice-dictation app (a functional Wispr Flow clone):
hold a global hotkey (default **Ctrl+Alt**), speak, and cleaned text is pasted into whatever app has
focus. STT and LLM cleanup are swappable between cloud (Groq/OpenAI) and fully local
(whisper.cpp / Ollama). Roadmap and rationale live in `docs/PLAN.md`.

## Commands

```
npm run dev          # electron-vite dev (starts the app)
npm run typecheck    # tsc --noEmit (single tsconfig, strict)
npm run build        # electron-vite build (main + preload + 3 renderer entries)
npm run package      # build + electron-builder --win → release/CodeFlow Setup <ver>.exe
```

There are no tests or linters configured. Verification = `typecheck` + `build` green, then a manual run.

- **After changing main-process code, fully restart `npm run dev`.** The app holds a single-instance
  lock; a second launch silently defers to the stale instance (Quit it from the tray first). "Hotkey
  does nothing" almost always means a stale instance, not a code bug.
- Debug logging: set `CODEFLOW_DEBUG=1` → step-by-step log at `%TEMP%\codeflow-debug.log` (`src/main/debug.ts`).
  It never logs dictated content.
- Git commits in this repo are authored solely as `ImMrLink <robertjholt97@gmail.com>` with **no
  Co-Authored-By trailer**. Pass commit messages via `-F <file>` — inline quotes break PowerShell arg parsing.

## Architecture

Three-window Electron app; all real logic lives in the main process, renderers are thin.

**Windows (created in `src/main/index.ts`):**
- **Settings window** — frameless (custom title bar in React), React UI at `src/renderer/src/App.tsx`
  (single file: shell + routed screens Home/Insights/History/Snippets/Scratchpad/Settings). Close hides
  to tray; only tray → Quit exits.
- **Overlay ("Flow Bar")** — transparent, click-through, always-on-top pill at bottom-center
  (`src/renderer/overlay/`). Driven by `Overlay.set(state, msg)` states:
  `hidden|listening|transcribing|formatting|pasting|done|error`.
- **Recorder** — hidden window that owns the mic. MediaRecorder → decode → resample to **16 kHz mono
  WAV** (`src/renderer/recorder/main.ts`); this one format feeds both cloud and local STT.

**The dictation pipeline (`src/main/pipeline.ts`) is the spine.** One dictation flows:
`HotkeyManager` (uiohook-napi, `src/main/hotkey.ts`) emits start/stop → `Pipeline.begin()` captures
the foreground app (`foreground.ts`, best-effort PowerShell) and starts the recorder →
`finish()` stops it, gets the WAV, transcribes (local: `providers/localWhisper.ts` spawns a
whisper.cpp CLI downloaded at runtime to `userData/whisper/`; cloud: `providers/stt.ts`) →
snippet expansion (`snippets.ts`: whole-utterance trigger returns verbatim and skips cleanup) →
optional LLM cleanup (`providers/llm.ts`, best-effort — falls back to raw) → `inject.ts` pastes via
clipboard + Ctrl+V keyTap (SendKeys fallback), restoring the prior clipboard → `history.ts` records
text + words/ms/app/fixes for the Insights stats. The overlay and a `pipeline:status` broadcast are
updated at each step.

**IPC pattern:** every renderer capability is an explicit channel in `src/main/ipc.ts`, exposed via
`contextBridge` in `src/preload/index.ts`. The exported `CodeflowApi` type (`typeof api`) is what the
renderer sees as `window.codeflow` (global declaration in `src/global.d.ts` — kept as a separate
basename on purpose; an `index.d.ts` next to `index.ts` gets ignored).

**Persistence:** four electron-store files — settings (`settings.ts`, schema + defaults), history,
snippets, notes. API keys live in `settings.secrets` as DPAPI ciphertext via `safeStorage`; the
renderer only ever sees `secretNames`.

## Gotchas that have already bitten

- **electron-store only shallow-merges top-level defaults.** Adding a nested key to a settings section
  requires no action *only because* `backfillDefaults()` in `settings.ts` deep-merges missing keys on
  startup (and `pruneUnknown()` drops removed ones). History has the same pattern via backfill in
  `getHistory()`. Keep new fields flowing through those.
- **Renderer CSP is `default-src 'self'`** — no CDN anything. Fonts (IBM Plex Sans, Space Mono) are
  self-hosted via `@fontsource` imports in `src/renderer/src/main.tsx`.
- **uiohook cannot suppress the Win key**, so Ctrl+Win chords pop the Start menu — the UI warns when
  "Win" is selected. `hotkey.ts` tracks modifier keycodes only and ignores auto-repeat.
- Overlay windows must use `showInactive()` — stealing focus breaks text injection into the target app.
- The Groq/OpenAI STT upload needs `new Blob([new Uint8Array(buffer)])` (a raw Buffer is not a BlobPart).
- whisper.cpp's zip extracts to nested `Release/` dirs; `localWhisper.ts` locates the exe recursively
  and must run it with `cwd = dirname(exe)` so its DLLs resolve.
- Packaging: `uiohook-napi` is auto-unpacked from asar by electron-builder; the whisper binary is
  **not** bundled (downloaded on first use). Icons: `resources/CodeFlow.ico` (window/tray, multi-size)
  and `resources/CodeFlow.png` (source for the exe/installer icon).

## Design source

The UI implements the "Ink & Paper" direction from the Claude Design project
`56eea4e9-b580-442a-bf61-c1b9a83f91c1` (file `CodeFlow App.dc.html`) — cream shell, crimson accent
`#C93A22`, IBM Plex Sans UI + Space Mono display, light/dark via CSS custom properties on
`body`/`body[data-theme="dark"]` (`src/renderer/src/App.css`), theme follows the OS.
