# CodeFlow Improvement Backlog — What Dictation Users Ask For and Complain About

_Research date: 2026-07-02. Sources: HN threads (Wispr Flow, Whispering, Handy, Aqua Voice, Ghost Pepper, Utter, Voibe, Dragon-alternatives Ask HN), GitHub issues (Handy, VoiceInk, FUTO Voice Input, Buzz, Whispering/Epicenter), Superwhisper's public feedback board (via third-party analyses), Wispr Flow's own changelog, review sites, and Reddit coverage. Every idea cites at least one URL showing real user demand. Ideas already shipped in CodeFlow are excluded; ideas already on `docs/PLAN.md` are marked **[on roadmap — evidence confirms]** so the plan can be re-prioritized with data._

_Caveat on sources: getvoibe.com, embertype.com, vocai.net and spokenly.app are competitor-run blogs. They are used here only where they aggregate verifiable primary data (feedback-board vote counts, the Reddit screenshot incident, latency benchmarks), and evidence strength is graded accordingly._

---

## 1. TL;DR — top recurring themes in user demand

1. **Custom vocabulary is the #1 accuracy complaint everywhere.** Names, technical terms, product names ("Claude Code" → "clawd code") fail constantly; a user dictionary is the most-cited gap in Handy, Ghost Pepper, Utter, and Voibe threads, and Wispr keeps shipping dictionary upgrades because of it.
2. **Latency is judged in milliseconds, not seconds.** Users benchmark end-of-speech → pasted text: ~1 s is acceptable, sub-500 ms is delightful, 2 s+ is a dealbreaker. The single most-reported latency bug in OSS apps is the **first words getting cut off** by slow mic init (especially Bluetooth).
3. **Privacy is a purchase decision, not a nice-to-have.** Wispr Flow's screenshot-upload scandal (and banning the user who reported it) is the most viral dictation story of the past year. Local-first, transparent, no-account tools win HN/Reddit sentiment.
4. **Subscription resentment is universal for local-capable tools.** "Why is a local app a subscription?" appears in nearly every thread. Free/one-time/open-source is a wedge — CodeFlow already sits on it.
5. **Windows is underserved.** Superwhisper's and Wispr's Windows ports ship with crashes/freezes; most OSS quality goes to macOS/Linux. A genuinely solid Windows-first app is itself a differentiator.
6. **"Never lose a dictation"** — failed transcriptions, cut-off recordings, and paste-into-wrong-window failures are the trust-killers. Users want retry-from-history and guaranteed clipboard fallback.
7. **Multilingual + auto language detection** is a top-4 voted request on Superwhisper's board; LLM cleanup that corrupts non-English text is a documented failure mode.
8. **Live feedback while speaking** (streaming partial transcript) is repeatedly requested; batch-only apps feel like a black box.
9. **Model choice matters to enthusiasts:** Parakeet v3 is repeatedly praised as faster/more accurate than Whisper for dictation; supporting it is a recurring OSS feature request.
10. **Developer workflows are the growth segment:** dictating into Cursor/Claude Code with file-name tagging was literally Wispr's "most requested feature."

---

## 2. Prioritized backlog

### Tier A — Quick wins (days each)

#### A1. Custom dictionary v1 (bias STT + cleanup with user words)
- **What:** A user-editable word list (names, jargon, acronyms, casings). Feed it to local whisper.cpp via `--prompt` (initial prompt), to Groq/OpenAI STT via the `prompt` field, and inject it into the LLM-cleanup system prompt ("prefer these spellings"). Auto-suggest words the user manually corrects later (Wispr-style) can come in v2.
- **Why users want it:** Top feature gap in the Handy HN thread ("company names, code libraries, proper nouns"); Ghost Pepper users report "clawd" for Claude; Utter thread: "the gap is most obvious on names, niche terminology, and technical vocabulary"; Handy issue asking for whisper initial-prompt support.
  - https://news.ycombinator.com/item?id=46628397
  - https://news.ycombinator.com/item?id=47666024
  - https://news.ycombinator.com/item?id=47296554
  - https://github.com/cjpais/Handy/issues/199
- **Evidence strength:** Very high — appeared in every single thread mined; Wispr's changelog shows continuous investment (starred words, usage ranking): https://wisprflow.ai/whats-new
- **Fit:** providers (`localWhisper.ts`, `stt.ts`, `llm.ts`) + pipeline + renderer (new settings screen, sibling of Snippets). _PLAN.md Phase 3 lists "custom dictionary" — this evidence says pull it forward._

#### A2. Kill the first-word cutoff (pre-warmed mic / rolling pre-roll buffer)
- **What:** Keep the recorder's audio stream warm (or open it on key-down with a ~500 ms pre-roll ring buffer) so the first syllables are never lost — including on Bluetooth headsets, which take 1–2 s to switch profiles.
- **Why users want it:** Handy's most-reacted open bug is "Microphone initialization delay (~500 ms) causes beginning of speech to be cut off" (marked critical); Bluetooth-delay complaints were the #1 issue (5+ mentions) in Handy's HN thread.
  - https://github.com/cjpais/Handy/issues/1283
  - https://news.ycombinator.com/item?id=46628397
- **Evidence strength:** High — concrete, repeated, and directly measurable.
- **Fit:** recorder (`src/renderer/recorder/main.ts`) + pipeline begin/finish handshake.

#### A3. VAD / silence-and-noise guard (stop Whisper hallucinations)
- **What:** Trim leading/trailing silence and detect "no speech" before transcribing; suppress Whisper's classic hallucinations on silence/noise ("thank you", repeated words). Optionally an input-level gate in settings.
- **Why users want it:** Ghost Pepper thread: hallucinated text appears mid-recording with background noise; Parakeet "dozen dozen dozen…" repetition; noisy-environment failures also raised in Handy's thread.
  - https://news.ycombinator.com/item?id=47666024
  - https://news.ycombinator.com/item?id=46628397
- **Evidence strength:** High — a known Whisper failure class users hit weekly.
- **Fit:** recorder (energy-based trim) + pipeline (no-speech early-exit → overlay "didn't catch that" state). _PLAN.md's pipeline sketch mentions "VAD/trim" but it isn't implemented._

#### A4. Retry failed dictation from history (never lose a take)
- **What:** Keep the last WAV until the pipeline fully succeeds; on STT/LLM/injection failure, store the audio with the history entry and offer one-click "retry transcription" from History and from the error toast.
- **Why users want it:** Wispr shipped exactly this ("failed transcript retry from notification or history") after complaints; Superwhisper users report recordings cut short and text pasted into the wrong app with no recovery path.
  - https://wisprflow.ai/whats-new
  - https://www.getvoibe.com/resources/superwhisper-review/ (documented board complaints)
- **Evidence strength:** Medium-high — "reliability > features" is the loudest meta-theme in Wispr's negative reviews (Trustpilot 2.7/5: https://www.getvoibe.com/resources/wispr-flow-review/).
- **Fit:** pipeline + history + renderer (History screen action). Audio retention must be opt-in/ephemeral (see do-not-build D3).

#### A5. Spoken punctuation + formatting toggles
- **What:** A lightweight post-STT layer that converts spoken "comma / period / new line / new paragraph" when enabled, plus independent toggles for auto-capitalization and auto-punctuation (some users want them OFF).
- **Why users want it:** FUTO Voice Input's most-reacted open requests: "Punctuating while dictating" (22 reactions), "option to disable automatic punctuation" (13), "disable auto capitalization and auto punctuation" (10). Ghost Pepper users asked for voice-controlled formatting ("new line", "capitalize").
  - https://github.com/futo-org/voice-input/issues/62
  - https://github.com/futo-org/voice-input/issues/20
  - https://github.com/futo-org/voice-input/issues/35
  - https://news.ycombinator.com/item?id=47666024
- **Evidence strength:** High for the toggle/command pair (older Dragon users especially expect it: https://news.ycombinator.com/item?id=45552836).
- **Fit:** pipeline (deterministic text pass before/instead of LLM cleanup) + settings.

#### A6. Output-mode option: paste / type / clipboard-only
- **What:** Per-user (later per-app) choice of injection: current clipboard-paste, direct keystroke typing, or "copy to clipboard only, don't paste" — with a clear toast in clipboard-only mode.
- **Why users want it:** Handy issue "Output to Clipboard Option"; Superwhisper board complaint about clipboard overwriting (12 votes) shows how sensitive paste behavior is; keyboard-layout bugs in direct-typing modes (Handy #439) show why users want to choose the mechanism.
  - https://github.com/cjpais/Handy/issues/110
  - https://github.com/cjpais/Handy/issues/439
  - https://www.getvoibe.com/resources/superwhisper-review/
- **Evidence strength:** Medium — several independent asks; cheap to ship since inject.ts already has both paths.
- **Fit:** inject + settings + pipeline.

#### A7. Pause/resume while dictating
- **What:** A hotkey (or overlay hover button in toggle mode) to pause the recording and resume without finalizing — for phone rings, thinking pauses, or gathering a source.
- **Why users want it:** #3 most-voted pending request on Superwhisper's public feedback board — **156 votes** ("Pause recording").
  - https://feedback.superwhisper.com/roadmap
  - https://www.getvoibe.com/resources/superwhisper-review/ (vote-count analysis)
- **Evidence strength:** High (rare to see a hard vote count this large).
- **Fit:** hotkey + recorder (MediaRecorder pause/resume) + overlay (new `paused` state).

#### A8. Long-dictation support (raise/remove the session cap gracefully)
- **What:** Ensure multi-minute rambles work: chunk long WAVs for STT, show elapsed time in the overlay, and never truncate silently.
- **Why users want it:** FUTO's 30-second cap drew 11 reactions of complaint; Wispr had to raise its cap from 5 → 20 minutes; Handy has an open bug on "missing segments in longer inputs".
  - https://github.com/futo-org/voice-input/issues/55
  - https://wisprflow.ai/whats-new
  - https://news.ycombinator.com/item?id=46628397
- **Evidence strength:** Medium.
- **Fit:** recorder + pipeline + providers (chunked transcription).

### Tier B — Medium (weeks each)

#### B1. Live partial transcript in the Flow Bar (streaming preview)
- **What:** While recording, show a rolling partial transcript in the overlay (chunked local whisper on a worker, or streaming cloud STT when available). Final text still goes through the normal cleanup pass — the preview is feedback, not the output.
- **Why users want it:** Whispering thread: "dictation either comes with a delay or only when dictation is over" — users want to see words appear; Ghost Pepper request #2 was streaming display; Utter thread calls streaming-with-accuracy the unsolved balance; users report a real cognitive benefit from live display.
  - https://news.ycombinator.com/item?id=44942731
  - https://news.ycombinator.com/item?id=47666024
  - https://news.ycombinator.com/item?id=47296554
- **Evidence strength:** High — 3 independent HN threads.
- **Fit:** overlay (bigger `listening` state) + providers (`transcribeStream` seam already in PLAN.md's interface) + pipeline. _PLAN.md Phase 5 has "streaming STT"; the preview can ship before true streaming providers._

#### B2. Parakeet / non-Whisper local model support
- **What:** Add NVIDIA Parakeet v3 (via sherpa-onnx or similar) as a second local STT engine alongside whisper.cpp, with a model-manager UI (download, switch, delete, custom model dir).
- **Why users want it:** Parakeet praised 7+ times in Handy's HN thread as the speed/accuracy sweet spot for dictation; 4+ requests in Whispering's thread ("superior to Whisper"); FUTO's #2 open request (17 reactions); VoiceInk shipped it after demand.
  - https://news.ycombinator.com/item?id=46628397
  - https://news.ycombinator.com/item?id=44942731
  - https://github.com/futo-org/voice-input/issues/149
  - https://github.com/Beingpax/VoiceInk/issues/244 (closed = shipped after demand)
- **Evidence strength:** Very high among the local-first crowd — this is *the* enthusiast request of 2025–26.
- **Fit:** providers (new `localParakeet.ts` behind the same SttEngine seam) + new model-manager subsystem + renderer settings.

#### B3. Per-app profiles (tone, language, formatting, output mode per foreground app)
- **What:** Extend the existing foreground-app capture into user-configurable profiles: e.g., Slack → casual + no trailing period; Outlook → formal; VS Code/terminal → verbatim mode with cleanup off; per-app language override.
- **Why users want it:** Superwhisper's per-mode system is its most-loved power feature (but manual mode-switching is a top complaint — auto-by-app is the fix); Wispr markets auto tone-by-app as a core differentiator; Dragon-alternative seekers cite "smart formatting" as a primary need.
  - https://www.getvoibe.com/resources/superwhisper-review/
  - https://news.ycombinator.com/item?id=45552836
  - https://wisprflow.ai/whats-new (context-aware features)
- **Evidence strength:** High. _PLAN.md Phase 3 has "app-context tone" — this evidence says generalize it into profiles, not just tone._
- **Fit:** pipeline (`foreground.ts` already captures the app) + settings + renderer (profiles UI).

#### B4. Multilingual correctness: auto language detection + cleanup that can't corrupt non-English
- **What:** Auto-detect language (whisper already can), per-dictation language pinning from a quick overlay picker, and a guarded LLM-cleanup prompt that preserves the source language (with a bypass when confidence is low).
- **Why users want it:** "Auto language detection" = 94 votes on Superwhisper's board; documented Superwhisper failure: cloud LLM modes corrupt non-English output; Handy bug: Canary model auto-translates to English against the user's will; Ghost Pepper: Chinese input unexpectedly outputs English; Wispr shipped a Flow Bar language picker in response to the same demand.
  - https://feedback.superwhisper.com/roadmap
  - https://github.com/cjpais/Handy/issues/1206
  - https://news.ycombinator.com/item?id=47666024
  - https://wisprflow.ai/whats-new
- **Evidence strength:** High. _PLAN.md v2 lists "100+ languages, auto-detect" — evidence confirms and adds the corruption-guard requirement._
- **Fit:** providers + pipeline (LLM prompt hardening) + overlay (language chip).

#### B5. Backtrack / self-correction cleanup ("…at 2, actually 3", "scratch that")
- **What:** Teach the cleanup prompt to resolve mid-utterance self-corrections and discard retracted fragments; ship with a view-diff in History so users can trust it.
- **Why users want it:** Whispering thread complaint that "models can't properly filter out the pauses" and on-the-fly corrections; Ghost Pepper users asked for vocal correction of words mid-dictation; it's Wispr's signature demo.
  - https://news.ycombinator.com/item?id=44942731
  - https://news.ycombinator.com/item?id=47666024
- **Evidence strength:** Medium-high. _PLAN.md Phase 3 "backtrack self-correction" — confirmed by evidence; keep._
- **Fit:** providers/llm prompt + history (store raw vs cleaned; UI diff toggle — PLAN.md "view-diff").

#### B6. More trigger options: foot pedal / arbitrary key / auto-stop (VAD endpointing)
- **What:** (a) allow any single non-modifier key or extra mouse button as PTT/toggle trigger (with a "may type into apps" warning where suppression is impossible); (b) generic HID/foot-pedal support; (c) optional auto-stop on N seconds of silence in hands-free mode.
- **Why users want it:** Foot-pedal asks in Whispering (3+ mentions) and Ghost Pepper threads; single-key toggle requests in Whispering; Handy's open "Auto push-to-talk" issue; Wispr shipped "Mouse Flow" (non-primary mouse buttons) from demand; accessibility users (RSI) need low-effort triggers.
  - https://news.ycombinator.com/item?id=44942731
  - https://news.ycombinator.com/item?id=47666024
  - https://github.com/cjpais/Handy/issues/147
  - https://wisprflow.ai/whats-new
- **Evidence strength:** Medium-high, and disproportionately valuable to accessibility users (Aqua thread: dictation as assistive tech, not convenience — https://news.ycombinator.com/item?id=43634005).
- **Fit:** hotkey (`uiohook` already sees mouse + all keys) + recorder (VAD) + settings UI.

#### B7. History export + transparent local storage
- **What:** Export history as Markdown/JSON/CSV; document where data lives; optional "append every dictation to a daily .md file" for note-takers.
- **Why users want it:** Whispering thread: 3+ requests for local markdown storage instead of opaque DBs ("transparent file-based data organization", easy export); pairs with the local-first trust theme.
  - https://news.ycombinator.com/item?id=44942731
- **Evidence strength:** Medium.
- **Fit:** history + renderer (History screen).

#### B8. Latency instrumentation + a public target
- **What:** Measure and display per-stage timings (record-stop → STT → cleanup → paste) in Insights; optimize until key-release → pasted-text is reliably ~1 s cloud / ~1.5 s local for a normal sentence, and publish the numbers.
- **Why users want it:** Users benchmark this publicly: Aqua ~965 ms end-of-speech→text vs Wispr ~1399 ms vs Superwhisper ~2407 ms; "about 1 s for an average sentence" called out as the acceptability bar in Whispering's thread; Superwhisper's stacked local-STT + cloud-LLM latency is a documented complaint.
  - https://spokenly.app/blog/aqua-voice-review
  - https://news.ycombinator.com/item?id=44942731
  - https://www.getvoibe.com/resources/superwhisper-review/
- **Evidence strength:** High — latency is the most-quantified expectation in the space.
- **Fit:** pipeline (timings already partially tracked for Insights) + renderer (Insights) + providers.

### Tier C — Long-term differentiators

#### C1. Privacy-preserving context awareness (no screenshots, ever)
- **What:** Wispr-quality context (what app, what's in the text field, what the conversation is about) built from *local, textual* signals only: window title, UI Automation text of the focused control, and an on-device summary — never screen captures, never uploaded raw. Make "how context works" a documented, auditable page.
- **Why users want it:** Users love what context does for accuracy but revolted at how Wispr does it — screenshots of the active window uploaded every few seconds, discovered via network sniffing; Wispr banned the reporting user before apologizing and making it opt-in. There is an open lane for "context without surveillance."
  - https://www.getvoibe.com/resources/is-wispr-flow-safe/
  - https://embertype.com/blog/the-day-wispr-flow-banned-a-user/
  - https://medium.com/@ryanshrott/why-i-cancelled-my-wispr-flow-subscription-and-what-im-using-instead-d783433f4411
- **Evidence strength:** Very high (viral incident; privacy was the dominant theme — 12 mentions — in the Aqua HN thread: https://news.ycombinator.com/item?id=43634005).
- **Fit:** new subsystem (Windows UI Automation reader) + pipeline + providers (context slot in cleanup prompt). Builds on existing `foreground.ts`.

#### C2. Developer mode: file/symbol tagging for AI-coding workflows
- **What:** When the foreground app is Cursor/VS Code/a terminal AI agent, resolve spoken file and folder names against the open workspace ("look at utils dot ts in the renderer folder" → `@src/renderer/utils.ts`), plus camelCase/snake_case/verbatim-code awareness.
- **Why users want it:** Wispr's changelog calls voice file tagging "the most requested feature," claiming 90% of user messages asked for it; Voibe's entire HN pitch was workspace-aware file/folder resolution for Cursor/Windsurf; code-term accuracy is the top developer complaint everywhere (Aqua trained a proprietary model on code-speak, claiming 97.4% vs Whisper's 65.1% on coding terms).
  - https://wisprflow.ai/whats-new
  - https://news.ycombinator.com/item?id=45374283
  - https://www.getvoibe.com/resources/aqua-voice-review/
- **Evidence strength:** High and growing — this is the segment where dictation demand is exploding. _PLAN.md v2 "code-syntax awareness" — this extends it with concrete workspace integration._
- **Fit:** new subsystem (workspace indexer per foreground app) + pipeline + providers.

#### C3. Command mode (scoped): select text + speak an instruction
- **What:** With text selected, hold a second hotkey and speak ("make it more assertive", "translate to French", "summarize to 3 bullets") → in-place rewrite. Deliberately scoped: no general computer control.
- **Why users want it:** "AI editing tools" requested in the Aqua thread; Dragon refugees want *some* voice control (Ask HN); Ghost Pepper users asked for vocal corrections. **Caution from the same evidence:** Aqua users found voice-editing awkward — "voice commands for edits take longer than manual fixes" (3 mentions) — so ship as opt-in, selection-triggered, never intercepting normal dictation.
  - https://news.ycombinator.com/item?id=43634005
  - https://news.ycombinator.com/item?id=45552836
  - https://news.ycombinator.com/item?id=47666024
- **Evidence strength:** Medium — real demand, but with documented UX risk. _PLAN.md v2 "Command Mode" — confirmed, with the scoping caveat._
- **Fit:** hotkey + pipeline (new branch: selection capture → instruction → inject) + providers.

#### C4. True streaming STT providers (sub-second perceived latency)
- **What:** Add a streaming cloud engine (Deepgram Nova-3 / gpt-4o-transcribe-style) behind the `transcribeStream` seam so text lands ~immediately on key-release, with the cleanup pass applied as a fast second step.
- **Why users want it:** The market leader on latency (Aqua, ~965 ms, instant-mode ~450 ms) wins reviews on exactly this; sub-second push-to-talk latency named as the requirement in Whispering's thread.
  - https://spokenly.app/blog/aqua-voice-review
  - https://news.ycombinator.com/item?id=44942731
- **Evidence strength:** Medium-high. _PLAN.md Phase 5 — confirmed._
- **Fit:** providers + pipeline + overlay (B1 is the stepping stone).

#### C5. Meeting/system-audio transcription with diarization (scope expansion)
- **What:** Capture system audio (WASAPI loopback) + mic, transcribe with speaker labels, save to History/Scratchpad. A different job than dictation — but the most-requested adjacent capability.
- **Why users want it:** Speaker diarization was the #1 request (5+ mentions) in Whispering's HN thread; VoiceInk has repeated open/closed issues for system-audio capture and diarization; Buzz's top-reacted requests are diarization + batch transcription.
  - https://news.ycombinator.com/item?id=44942731
  - https://github.com/Beingpax/VoiceInk/issues/529
  - https://github.com/Beingpax/VoiceInk/issues/199
  - https://github.com/chidiwilliams/buzz/issues/492
- **Evidence strength:** High for the adjacent-tool audience; medium for CodeFlow's core dictation user. Treat as an optional expansion, not core.
- **Fit:** new subsystem (loopback capture, diarization model) + providers + renderer.

#### C6. Personal adaptation: learn from the user's corrections
- **What:** Track when users edit pasted text (opt-in), mine repeated fixes into dictionary suggestions and cleanup-prompt hints — an on-device "it gets better the more you use it" loop, which is Wispr's stickiest marketing claim, done locally.
- **Why users want it:** Custom fine-tuning on individual voice/vocab requested in Ghost Pepper thread; Wispr's auto-learning dictionary is repeatedly cited as why people stay; accessibility users need near-perfect accuracy and can't afford editing friction (Aqua thread).
  - https://news.ycombinator.com/item?id=47666024
  - https://news.ycombinator.com/item?id=43634005
  - https://wisprflow.ai/whats-new
- **Evidence strength:** Medium (harder to attribute vote counts; strong qualitative pull).
- **Fit:** new subsystem (correction detector) + history + dictionary (A1) + providers.

---

## 3. Do-not-build list (what users actively hate)

- **D1. Screenshot/screen-content capture uploaded to the cloud.** The Wispr Flow incident — active-window screenshots uploaded every few seconds, discovered by a user sniffing traffic, who was then banned — is the cautionary tale of the category. If CodeFlow ever adds context awareness, it must be local, textual, opt-in, and documented (see C1). https://www.getvoibe.com/resources/is-wispr-flow-safe/ · https://embertype.com/blog/the-day-wispr-flow-banned-a-user/
- **D2. Accounts, subscriptions, word caps, or trials that degrade.** "Why structure pricing like you are [when truly local]?" (Whispering thread); "another monthly subscription" resentment (Aqua thread); Wispr's 2.7/5 Trustpilot is driven by billing/reliability anger; MacWhisper's one-time fee is cited 7 times in one thread as the standard to meet. CodeFlow's free/MIT/no-account stance is its moat — never dilute it. https://news.ycombinator.com/item?id=44942731 · https://news.ycombinator.com/item?id=43634005 · https://www.getvoibe.com/resources/wispr-flow-review/
- **D3. Saving audio recordings to disk by default with no opt-out.** Superwhisper's top-voted privacy complaint (23 votes). Any audio retention (e.g., for A4 retry) must be opt-in, visible, and auto-purged. https://www.getvoibe.com/resources/superwhisper-review/
- **D4. Plaintext API-key storage.** 15-vote Superwhisper complaint. CodeFlow already does DPAPI via `safeStorage` — keep it that way and say so on the website. https://www.getvoibe.com/resources/superwhisper-review/
- **D5. Clipboard stomping.** Superwhisper overwrites clipboard contents (12-vote complaint). CodeFlow already saves/restores — treat any regression as a P0 bug, and test against clipboard-manager apps. https://www.getvoibe.com/resources/superwhisper-review/
- **D6. Big, intrusive recording UI.** Superwhisper's "big overlay window" drew 19 votes of complaints. Keep the Flow Bar a small, click-through pill; if B1's live transcript grows it, make size/position/visibility configurable. https://www.getvoibe.com/resources/superwhisper-review/
- **D7. Notification spam.** Called out against Whispering ("notification overload"). Default to silent success; notify only on failure or clipboard-only mode. https://news.ycombinator.com/item?id=44942731
- **D8. Heavy idle footprint.** Wispr's Windows Electron app "eats RAM for breakfast" (~800 MB, ~8% idle CPU reported) and spins fans while idle — a named reason for cancellations. CodeFlow is also Electron: budget idle RAM/CPU, lazy-load renderers, and publish the numbers. https://medium.com/@ryanshrott/why-i-cancelled-my-wispr-flow-subscription-and-what-im-using-instead-d783433f4411 · https://www.getvoibe.com/resources/wispr-flow-review/
- **D9. A half-baked port / rushed platform expansion.** Superwhisper's Windows version shipped with crashes, freezes, and clipboard bugs and it defines the app's Windows reputation; Wispr's Windows build freezes target apps like VS Code. Better to make Windows flawless than to chase macOS/mobile early. https://www.getvoibe.com/resources/superwhisper-review/ · https://www.getvoibe.com/resources/wispr-flow-review/
- **D10. Cloud-only lock-in.** Aqua's biggest thread criticism (12 privacy mentions, 11 requests for local mode): no on-device option at any tier. CodeFlow's local path must always stay first-class — never let a cloud-only feature become load-bearing. https://news.ycombinator.com/item?id=43634005
- **D11. Ignoring the feedback board.** 93.5% of Superwhisper's 476 public feedback tickets sit unaddressed — users cite the dead board itself as a reason to leave. If CodeFlow opens GitHub issues/discussions, triage visibly. https://www.getvoibe.com/resources/superwhisper-review/
- **D12. Training on user data by default.** Wispr only made training opt-in after the backlash. CodeFlow sends nothing anywhere without a user-supplied key; keep zero-telemetry as a written guarantee. https://www.getvoibe.com/resources/is-wispr-flow-safe/

---

## Appendix — primary threads mined

| Source | URL |
|---|---|
| Show HN: Wispr Flow | https://news.ycombinator.com/item?id=41696153 |
| Show HN: Whispering (open-source, local-first) | https://news.ycombinator.com/item?id=44942731 |
| HN: Handy (free OSS speech-to-text) | https://news.ycombinator.com/item?id=46628397 |
| Show HN: Aqua Voice 2 | https://news.ycombinator.com/item?id=43634005 |
| Show HN: Ghost Pepper (local hold-to-talk, macOS) | https://news.ycombinator.com/item?id=47666024 |
| Show HN: Utter (local-first, Mac/iPhone) | https://news.ycombinator.com/item?id=47296554 |
| Show HN: Voibe (dictation for developers) | https://news.ycombinator.com/item?id=45374283 |
| Ask HN: best alternative to Dragon NaturallySpeaking | https://news.ycombinator.com/item?id=45552836 |
| Handy issues (top-reacted) | https://github.com/cjpais/Handy/issues |
| VoiceInk issues (top-reacted) | https://github.com/Beingpax/VoiceInk/issues |
| FUTO Voice Input issues (top-reacted) | https://github.com/futo-org/voice-input/issues |
| Buzz issues (top-reacted) | https://github.com/chidiwilliams/buzz/issues |
| Whispering / Epicenter repo | https://github.com/EpicenterHQ/epicenter |
| Superwhisper public feedback board | https://feedback.superwhisper.com/roadmap |
| Wispr Flow changelog ("what's new") | https://wisprflow.ai/whats-new |
| Talon learning-curve write-ups | https://www.joshwcomeau.com/blog/hands-free-coding/ · https://handsfreecoding.org/2021/12/12/talon-in-depth-review/ |
| Wispr privacy incident coverage | https://www.getvoibe.com/resources/is-wispr-flow-safe/ · https://embertype.com/blog/the-day-wispr-flow-banned-a-user/ |
| Wispr cancellation post-mortem (user) | https://medium.com/@ryanshrott/why-i-cancelled-my-wispr-flow-subscription-and-what-im-using-instead-d783433f4411 |
| Latency benchmark comparison | https://spokenly.app/blog/aqua-voice-review |
