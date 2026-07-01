# CodeFlow

A Windows-native, AI voice-dictation app — press a hotkey, speak, and clean, formatted text is
typed into whatever app is focused. A functional remake of [Wispr Flow](https://wisprflow.ai),
runnable with **either local models or cloud API keys**.

- 🎙️ Global push-to-talk / hands-free dictation from any app
- ✨ AI formatting: filler removal, punctuation, self-correction, context-aware tone
- ⌨️ Universal text injection (clipboard-paste primary, keystroke fallback)
- 🔒 Your choice: 100% local (whisper.cpp + Ollama) or cloud (Groq/OpenAI/Deepgram + Claude)

## Status

🚧 **Planning.** See the full implementation plan in [`docs/PLAN.md`](docs/PLAN.md).

## Planned stack

Electron + TypeScript (React UI). See the plan for rationale, architecture, provider
abstraction, milestones, and risks.
