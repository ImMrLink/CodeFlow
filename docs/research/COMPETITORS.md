# Competitive Landscape: Voice Dictation / "Speech-to-Text Everywhere" Apps

**Researched:** July 2026 (all pricing "as of July 2026" unless noted)
**Purpose:** Source material for CodeFlow's public comparison table and marketing site.
**Sourcing rule used:** primary (official) pages for pricing wherever reachable; community sources (Reddit, HN, GitHub issues, Trustpilot) for complaints. Claims that rest only on third-party/competitor blogs are flagged as such — **verify those before putting them in a public table.**

---

## 1. TL;DR — The 5 most exploitable weaknesses in this market

1. **Word caps on free tiers.** Wispr Flow's free plan caps at 2,000 words/week ([wisprflow.ai/pricing](https://wisprflow.ai/pricing)); Aqua Voice's free tier is a *one-time lifetime* 1,000 words ([aquavoice.com](https://aquavoice.com/)). CodeFlow has no caps at all.
2. **Cloud-only processing + a documented privacy scare.** Wispr Flow and Aqua Voice send audio (and, historically for Wispr, screen context) to cloud servers; Wispr had a widely-discussed 2025 privacy incident ([modelpiper.com](https://modelpiper.com/blog/wispr-flow-privacy-incident), [HN on Aqua](https://news.ycombinator.com/item?id=43634005)). Windows' built-in Win+H also requires internet ([voicetotext24.com](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24)).
3. **Windows is underserved.** The best-loved local dictation apps (MacWhisper, VoiceInk, Superwhisper's strongest builds) are Mac-first; Superwhisper's Windows port has reported crashes/clipboard bugs ([spokenly.app review — competitor blog, verify](https://spokenly.app/blog/superwhisper-review)); Dragon abandoned Mac in 2018 and costs $699 on Windows ([Apple discussions](https://discussions.apple.com/thread/8611373), [Staples](https://www.staples.com/nuance-dragon-professional-v16-for-1-user-windows-download-sn-dp09a-g00-16-0/product_24581655)).
4. **Subscription fatigue + account walls.** Wispr Flow Pro is $12–15/mo with a required account; Aqua is $8/mo (billed annually) with an account; HN commenters on Aqua explicitly cite one-time-payment tools as the preferred model ([news.ycombinator.com/item?id=43634005](https://news.ycombinator.com/item?id=43634005)).
5. **The open-source offline tools that exist are either not "dictation-everywhere" (Buzz, Vibe are file-transcription apps) or young/rough (Handy Parakeet failures, [GitHub issue #1165](https://github.com/cjpais/Handy/issues/1165)) — leaving room for a polished, Windows-first, MIT, hold-to-talk app.**

---

## 2. Comparison matrix

Values as of July 2026. "Works offline" = speech-to-text can run with no internet.

| Product | Platforms | Price | Free-tier limits | Account required | Works offline | Open source |
|---|---|---|---|---|---|---|
| **CodeFlow** | Windows | Free forever | None (no caps, no telemetry) | No | Yes (bundled whisper.cpp; optional BYOK Groq/OpenAI cloud) | Yes (MIT) |
| **Wispr Flow** | Mac, Windows, iPhone, Android | Pro $15/mo or $12/mo annual ([source](https://wisprflow.ai/pricing)) | 2,000 words/wk (Mac/Win); 1,000 words/wk (iPhone) ([source](https://wisprflow.ai/pricing)) | Yes | No — cloud STT, needs network ([Wispr docs](https://docs.wisprflow.ai/articles/3834764683-why-vpns-or-security-tools-can-block-wispr-flow)) | No |
| **Superwhisper** | Mac, Windows, iOS ([source](https://superwhisper.com)) | Pro $8.49/mo; ~$84.99/yr; lifetime $249.99 per trackers — *lifetime price conflicting, verify* (see §3) | Free tier: unlimited use of *small local models*; 15-min Pro trial ([source](https://superwhisper.com)) | For paid features | Yes (local models, best on Apple Silicon) ([source](https://superwhisper.com)) | No |
| **MacWhisper** | macOS only | Pro €59 one-time (Gumroad) ([source](https://goodsnooze.gumroad.com/l/macwhisper), [price via review](https://www.getvoibe.com/resources/macwhisper-pricing/)) | Free tier usable (smaller models) | No | Yes (on-device Whisper) | No |
| **VoiceInk** | macOS only | $25/$39/$49 one-time ([source](https://tryvoiceink.com/pricing)) | 7-day trial; or build free from source | No | Yes (local Whisper) | Yes (GPL-3.0, [GitHub](https://github.com/beingpax/VoiceInk)) |
| **Aqua Voice** | Mac, Windows 10/11, iOS keyboard ([source](https://aquavoice.com/download)) | Pro $8/mo billed annually; Team $12/mo ([source](https://aquavoice.com/)) | 1,000 words **one-time lifetime** allotment ([source](https://aquavoice.com/)) | Yes | No — cloud only ([HN](https://news.ycombinator.com/item?id=43634005)) | No |
| **Talon Voice** | Windows, Mac, Linux ([source](https://talon.wiki/Help/beta_talon/)) | Free; beta builds via Patreon (tiers from ~$5/mo) ([source](https://www.patreon.com/lunixbochs)) | None on public release | No (Patreon for beta) | Yes (local engines) | Core closed; user scripts/community repos open ([talonvoice.com](https://talonvoice.com/)) |
| **Dragon Professional v16** | Windows only | $699–$699.99 one-time perpetual ([Staples](https://www.staples.com/nuance-dragon-professional-v16-for-1-user-windows-download-sn-dp09a-g00-16-0/product_24581655)) | No free tier | License activation | Yes (local desktop engine) | No |
| **Windows voice typing (Win+H)** | Windows 10/11 (built-in) | Free | None | No (built into OS) | No — requires internet ([voicetotext24](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24)) | No |
| **Handy** | Windows, Mac, Linux | Free ([GitHub](https://github.com/cjpais/Handy)) | None | No | Yes (Whisper + Parakeet V3, fully offline) | Yes (MIT, 25.4k stars) |
| **Buzz** | Windows, Mac, Linux | Free (paid Mac App Store variant exists) | None | No | Yes | Yes (MIT, 19.9k stars, [GitHub](https://github.com/chidiwilliams/buzz)) — *file transcription app, not system-wide dictation* |
| **FUTO Voice Input** | Android only | Free; optional $5 one-time license ([voiceinput.futo.org](https://voiceinput.futo.org/)) | None | No | Yes (fully on-device) | Source-available ("FUTO Source First License 1.0" — not OSI open source) ([GitHub](https://github.com/futo-org/voice-input)) |
| **Vibe** | Windows, Mac, Linux | Free | None | No | Yes | Yes (MIT, 6.7k stars, [GitHub](https://github.com/thewh1teagle/vibe)) — *file transcription app, not system-wide dictation* |
| **OpenWhispr** | Windows, Mac, Linux | Free ([GitHub](https://github.com/OpenWhispr/openwhispr)) | None | No | Yes (local Whisper/Parakeet; optional BYOK cloud) | Yes (MIT, 4.2k stars) |

---

## 3. Per-competitor detail

### Wispr Flow (primary competitor)

**Overview.** Hold-to-talk AI dictation ("speak naturally, get polished text in any app"). The category leader we position against. Mac, Windows, iPhone, Android.

**Pricing (as of July 2026, [wisprflow.ai/pricing](https://wisprflow.ai/pricing)).**
- Flow Basic (free): 2,000 words/week on Mac or Windows; 1,000 words/week on iPhone; "unlimited words on Android (limited time only)".
- Flow Pro: $15/user/mo monthly, $12/user/mo billed annually (= $144/yr). Unlimited words, Command Mode, priority support.
- Enterprise: custom (SOC 2, SSO, enforced HIPAA).
- 14-day Pro trial, no credit card. Account required to use the product.

**Processing model.** Cloud STT — audio leaves the machine for every dictation; the app stops working when network/VPN blocks its endpoints (official troubleshooting doc: ["Connection lost" / network connection issues](https://docs.wisprflow.ai/articles/3834764683-why-vpns-or-security-tools-can-block-wispr-flow)). Offers "privacy mode" and HIPAA-ready claims on paid/enterprise tiers ([pricing page](https://wisprflow.ai/pricing)).

**Top complaints.**
- *2025 privacy incident (third-party accounts — verify against the original Reddit thread before publishing):* users reported via network-traffic monitoring that the app captured periodic screenshots of the active window for "context awareness" and uploaded them to cloud/third-party AI servers; the user who reported it was initially banned, followed by a public CTO apology; the company subsequently made AI training opt-in and switched context capture to accessibility-API text near the cursor. Sources: [modelpiper.com](https://modelpiper.com/blog/wispr-flow-privacy-incident), [vocai.net](https://vocai.net/blog/wispr-flow-review-privacy-2026/), [embertype.com](https://embertype.com/blog/the-day-wispr-flow-banned-a-user/).
- *Low Trustpilot rating:* 2.7/5 reported as of April 2026, with complaints clustering on post-trial reliability degradation and billing/referral issues ([trustpilot.com/review/wisprflow.ai](https://www.trustpilot.com/review/wisprflow.ai); rating figure via [spokenly.app review — competitor blog, verify](https://spokenly.app/blog/wispr-flow-review)). Note the split: iOS App Store ~4.8/5, G2 4.5/5 — organic web reviews are far harsher.
- *Subscription cancellations over value/privacy:* e.g. ["Why I Cancelled My Wispr Flow Subscription" (Medium)](https://medium.com/@ryanshrott/why-i-cancelled-my-wispr-flow-subscription-and-what-im-using-instead-d783433f4411).
- *Resource usage:* ~800 MB RAM / 8% idle CPU reported on a 2021 MacBook Pro ([vocai.net — competitor blog, verify](https://vocai.net/blog/wispr-flow-review-privacy-2026/)).
- *Windows client stability:* Wispr's own help center documents Windows crashes from graphics rendering failures, app freezes/slow launches in a recent version, and silent dictation-history deletion when app data was read-only ([official docs](https://docs.wisprflow.ai/articles/2999006910-reset-and-restart-the-wispr-flow-app), [transcription errors doc](https://docs.wisprflow.ai/articles/4984532368-fix-taking-longer-than-usual-and-transcription-errors)).

**Strengths (be fair):** best-in-class polish and formatting, auto-edits/tone matching, multi-platform including mobile, large language support, strong iOS ratings.

---

### Superwhisper

**Overview.** Popular Whisper-based dictation app, Mac-first, now also Windows and iOS ([superwhisper.com](https://superwhisper.com)). Local + cloud hybrid models, "modes" for different writing tasks.

**Pricing (as of July 2026).** Official site renders exact figures at checkout; per the site and third-party trackers: Pro $8.49/mo (student discount 40%), annual ~$84.99 ("2 months free"), lifetime license historically $249.99 ([superwhisper.com](https://superwhisper.com); [getvoibe tracker](https://www.getvoibe.com/resources/superwhisper-pricing/); [spokenly tracker](https://spokenly.app/blog/superwhisper-pricing)). **Conflict flag:** several trackers published June 2026 claim the lifetime tier was raised sharply (figures around $849 circulate: [spokenly](https://spokenly.app/blog/superwhisper-pricing), [weesperneonflow](https://weesperneonflow.ai/en/blog/2026-06-02-superwhisper-pricing-plans-lifetime-2026/)) — these are competitor blogs and may share a scraping error; **confirm at superwhisper.com checkout before publishing any lifetime figure.** Free tier: unlimited use of small local AI models; Pro features trial limited to 15 minutes of recording ([superwhisper.com](https://superwhisper.com)).

**Processing model.** Hybrid: fully offline local models (best on Apple Silicon) plus optional cloud models; site notes Intel Macs "work best with cloud models" ([superwhisper.com](https://superwhisper.com)).

**Top complaints.**
- Windows version shipped with reported crashes, target-app freezes, and clipboard issues ([spokenly review — competitor blog citing Superwhisper's public feedback board, verify](https://spokenly.app/blog/superwhisper-review)).
- Audio recordings saved locally by default with no simple opt-out; API keys reportedly stored in plaintext JSON rather than Keychain ([spokenly review — competitor blog, verify](https://spokenly.app/blog/superwhisper-review)).
- Settings complexity described as "overwhelming"; auto language detection weak for bilingual code-switching ([spokenly review](https://spokenly.app/blog/superwhisper-review)).

**Strengths:** genuinely offline-capable, strong Apple Silicon performance, lifetime option exists, free tier has no word cap.

---

### MacWhisper

**Overview.** Jordi Bruin's on-device Whisper app for macOS — primarily a *file transcription* tool with a dictation feature added later ([Gumroad](https://goodsnooze.gumroad.com/l/macwhisper), [whisper.cpp discussion](https://github.com/ggml-org/whisper.cpp/discussions/420)).

**Pricing (as of July 2026).** Free tier (smaller models); Pro is a one-time license on Gumroad, listed at €59 (~$69) with lifetime updates ([goodsnooze.gumroad.com/l/macwhisper](https://goodsnooze.gumroad.com/l/macwhisper); figure via [getvoibe tracker — verify on Gumroad, page is JS-rendered](https://www.getvoibe.com/resources/macwhisper-pricing/)). A separate Mac App Store version uses subscription pricing, which users call confusing ([Medium: "MacWhisper's Pricing Is Confusing on Purpose"](https://medium.com/ai-tools-tips-and-news/macwhispers-pricing-is-confusing-on-purpose-here-s-what-i-actually-paid-51c39d1a18fe)). 25% discount for students/journalists/nonprofits by email.

**Processing model.** 100% on-device Whisper; no account.

**Top complaints.**
- Dictation is a bolted-on secondary feature: ~2.4 s silence before text appears, no real-time streaming, text drops all at once ([lumevoice 30-day review](https://lumevoice.com/blog/macwhisper-review-2026/)).
- ~1.1 GB RAM as a background process; slowdowns on 8 GB Macs ([lumevoice](https://lumevoice.com/blog/macwhisper-review-2026/)).
- Dictation fails in apps that don't use standard macOS text fields (official support doc: [macwhisper.helpscoutdocs.com](https://macwhisper.helpscoutdocs.com/article/44-dictation-not-working-in-specific-apps)).
- Mac-only; no Windows/Linux.

**Strengths:** beloved one-time pricing, excellent file transcription, true local privacy.

---

### VoiceInk

**Overview.** Open-source (GPL-3.0) macOS dictation app using local Whisper models; markets itself as "the open-source alternative to Superwhisper & Wispr Flow" ([github.com/beingpax/VoiceInk](https://github.com/beingpax/VoiceInk), 4.3k+ stars).

**Pricing (as of July 2026, [tryvoiceink.com/pricing](https://tryvoiceink.com/pricing)).** One-time licenses: Solo $25 (1 Mac), Personal $39 (2 Macs), Extended $49 (3 Macs); lifetime updates; 7-day trial; free if you build from source.

**Processing model.** Local Whisper on-device; optional cloud "enhancement" paths (e.g. Voxtral, custom AI).

**Top complaints.**
- Intermittent empty/truncated transcriptions on short utterances or hotkey timing races — community GitHub issues #686/#687/#696 (May 2026), summarized in [voisty.com review](https://voisty.com/voiceink-review/); issue tracker: [github.com/beingpax/VoiceInk/issues](https://github.com/beingpax/VoiceInk/issues).
- Latency complaints on cloud-enhancement path; requests for local-only alternatives (issues #534, #609 via [voisty](https://voisty.com/voiceink-review/)).
- **Mac-only** — nothing for Windows users.

**Strengths:** the closest philosophical competitor to CodeFlow (open source, local, one-time/no subscription) — but on the other OS.

---

### Aqua Voice

**Overview.** YC-backed cloud dictation startup ("Avalon" model); system-wide hotkey dictation for Mac and Windows, iOS keyboard added April 2026 ([aquavoice.com](https://aquavoice.com/), [FAQ](https://aquavoice.com/info/faq), [Show HN](https://news.ycombinator.com/item?id=43634005)).

**Pricing (as of July 2026, [aquavoice.com](https://aquavoice.com/)).** Starter free: **1,000 words one-time lifetime** allotment, basic engine, 5 dictionary entries. Pro: $8/mo billed annually (unlimited words, Avalon model, 800 dictionary entries). Team $12/mo; Enterprise custom. Student discount reported at 70% off annual ([spokenly tracker — verify](https://spokenly.app/blog/aqua-voice-pricing)).

**Processing model.** Cloud-only; privacy policy discloses voice inputs shared with service providers including OpenAI (discussed in [HN thread](https://news.ycombinator.com/item?id=43634005)). Site claims "nothing is stored on our servers" for history ([aquavoice.com](https://aquavoice.com/)).

**Top complaints (from [HN: Show HN Aqua Voice 2](https://news.ycombinator.com/item?id=43634005)).**
- Cloud-only is a dealbreaker: "Local inference only is an absolute requirement"; "I want privacy, offline mode and source code."
- Subscription model resented vs one-time tools: commenters contrast MacWhisper's "one-time payment… the way shareware is supposed to be."
- No Linux support; iOS hampered by platform restrictions.
- Free tier so small (≈8 minutes of speech, lifetime) that it's evaluation-only ([getvoibe tracker — competitor blog, verify](https://www.getvoibe.com/resources/aqua-voice-pricing/)).
- Windows antivirus false positives requiring whitelisting (official [FAQ](https://aquavoice.com/info/faq)).

**Strengths:** repeatedly praised for accuracy/speed and streaming latency; responsive founders.

---

### Talon Voice

**Overview.** Free hands-free-computing platform (full voice control, eye tracking, noise input) for Windows/Mac/Linux — the accessibility/voice-coding power tool, not a casual dictation app ([talonvoice.com](https://talonvoice.com/)).

**Pricing (as of July 2026).** Public release free. Beta builds gated behind Patreon support (tiers start ~$5/mo; beta access commonly associated with higher tiers — exact tier price not published on the wiki; see [talon.wiki beta page](https://talon.wiki/Help/beta_talon/) and [patreon.com/lunixbochs](https://www.patreon.com/lunixbochs)).

**Processing model.** Local speech engines; works offline. Core app is closed-source freeware; the command ecosystem (talonhub/community) is open ([awesome-talon](https://github.com/trillium/awesome-talon)).

**Top complaints.**
- Steep learning curve: requires learning a command grammar (alphabet like "air bat cap"), config in Python/Talonscript; days-to-weeks to be productive ([Josh Comeau: Hands-free coding](https://www.joshwcomeau.com/blog/hands-free-coding/); accessibility-community roundup: [s10.ai](https://s10.ai/blog/speech-recognition-systems-reddit-reviewed)).
- Prose dictation is not the focus — it's command-first; casual users bounce off.

**Strengths:** unmatched for voice coding/accessibility; free; cross-platform; devoted community. Different niche from CodeFlow — don't position hard against it.

---

### Dragon Professional v16 (Nuance/Microsoft)

**Overview.** The legacy enterprise dictation suite, Windows-only ([dragon.nuance.com](https://dragon.nuance.com/en-us/dragon-professional)).

**Pricing (as of July 2026).** $699.00–$699.99 one-time perpetual license for 1 user via retailers ([Staples listing](https://www.staples.com/nuance-dragon-professional-v16-for-1-user-windows-download-sn-dp09a-g00-16-0/product_24581655), [CDW](https://www.cdw.com/product/dragon-professional-v.-16-license-1-user/7492280)); Nuance's own site hides pricing behind "contact sales" ([dragon.nuance.com](https://dragon.nuance.com/en-us/dragon-professional)). Price history: Professional Individual jumped from $299 to $699, and the cheaper Dragon Home line was discontinued (2023) ([usevoicy roundup — competitor blog, verify](https://usevoicy.com/blog/best-dragon-alternatives-2026)).

**Processing model.** Local desktop engine (works offline); enterprise cloud management optional.

**Top complaints.**
- **Mac abandoned:** Dragon Professional Individual for Mac discontinued October 2018; no support/updates since ([Apple Communities thread](https://discussions.apple.com/thread/8611373), [dictationdaddy](https://www.dictationdaddy.com/blog/dragon-dictate-mac-os-x)).
- Price: $699 is 4–8 years of competitors' subscriptions, and there's no trial/free tier ([Staples](https://www.staples.com/nuance-dragon-professional-v16-for-1-user-windows-download-sn-dp09a-g00-16-0/product_24581655)).
- Users report lag/freezes with Office apps ("I have to crash and relaunch Outlook every day just to unfreeze Dragon") and heavy correction burden despite voice training ([usevoicy roundup quoting user reports — verify](https://usevoicy.com/blog/best-dragon-alternatives-2026)).
- Dated UX; historically required reading training passages before acceptable accuracy ([usevoicy](https://usevoicy.com/blog/best-dragon-alternatives-2026)).

**Strengths:** deep OS/command integration, industry vocabularies, true perpetual license, local processing — still entrenched in legal/medical.

---

### Windows built-in voice typing (Win+H)

**Overview.** Free dictation built into Windows 10/11; press Win+H, speak into any text field.

**Pricing.** Free, included with Windows. No separate account beyond the OS.

**Processing model.** **Cloud** — speech goes to Microsoft's online speech services; no internet, no dictation ([voicetotext24](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24), [windowsforum guide](https://windowsforum.com/threads/windows-voice-typing-fast-free-dictation-across-apps-with-win-h.380428/)).

**Top complaints.**
- Requires internet; drops mid-sentence with Wi-Fi ([voicetotext24](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24)).
- Punctuation commands unreliable — e.g. "comma" inconsistently recognized (Microsoft Q&A: [learn.microsoft.com](https://learn.microsoft.com/en-us/answers/questions/4009593/windows-11-dictation-feature-(win-h)-fails-to-cons)).
- No AI cleanup, no filler-word removal, no custom vocabulary; accuracy drops on technical terms/proper nouns (~85–90% conversational per [talkpad roundup — verify](https://talkpad.ai/blog/best-voice-to-text-windows/)).
- Must be manually invoked each time; no always-ready hold-to-talk flow ([talkpad](https://talkpad.ai/blog/best-voice-to-text-windows/)).

**Strengths:** zero install, free, good enough for casual notes — this is CodeFlow's "default" competitor on Windows.

---

### Handy (open source)

**Overview.** "Free, open source, extensible speech-to-text that works completely offline" — press shortcut, speak, text appears in any field. Built by CJ Pais after an RSI injury. Windows/macOS/Linux ([github.com/cjpais/Handy](https://github.com/cjpais/Handy), MIT, 25.4k stars; [handy.computer](https://handy.computer/)).

**Pricing.** Free, no account, no caps.

**Processing model.** Fully local: Whisper (GPU) and Parakeet V3 (CPU) ([GitHub README](https://github.com/cjpais/Handy)).

**Top complaints.**
- Parakeet transcription failures spiked after v0.8/0.8.1 ([GitHub issue #1165](https://github.com/cjpais/Handy/issues/1165)); fixes shipped in later releases ([releases](https://github.com/cjpais/Handy/releases)).
- Positions itself as "the most forkable, not the best" — fewer polish features (AI cleanup, context formatting) than commercial rivals ([handy.computer](https://handy.computer/)).
- HN reception strongly positive (200+ point thread, Linux users especially: [news.ycombinator.com/item?id=46628397](https://news.ycombinator.com/item?id=46628397)).

**Positioning note:** Handy is CodeFlow's nearest open-source analog and is cross-platform. CodeFlow differentiates on Windows-first polish, AI cleanup (incl. local Ollama), snippets, scratchpad, history, and stats.

---

### Buzz (open source)

**Overview.** MIT-licensed desktop GUI for Whisper — **transcribes/translates audio files and live mic in-app; it is not a system-wide dictation tool** ([github.com/chidiwilliams/buzz](https://github.com/chidiwilliams/buzz), 19.9k stars). Win/Mac/Linux; free (paid Mac App Store version exists).

**Top complaints (GitHub).** Crashes at end of transcription ([#625](https://github.com/chidiwilliams/buzz/issues/625)); whisper.cpp crash on Windows 1.2.0 ([#1078](https://github.com/chidiwilliams/buzz/issues/1078)); Faster-Whisper GPU failures ([#1160](https://github.com/chidiwilliams/buzz/issues/1160)); model-download corruption crashes (official [FAQ](https://chidiwilliams.github.io/buzz/docs/faq)).

### Vibe (open source)

**Overview.** MIT-licensed offline transcription app (thewh1teagle) for audio/video **files** — again, not dictation-everywhere. Win/Mac/Linux, GPU-optimized, 6.7k stars ([github.com/thewh1teagle/vibe](https://github.com/thewh1teagle/vibe); [site](https://thewh1teagle.github.io/vibe/)).

**Top complaints (GitHub).** Crash at transcription start ([#899](https://github.com/thewh1teagle/vibe/issues/899)); garbled output on AMD GPUs ([#655](https://github.com/thewh1teagle/vibe/issues/655)); Windows 11 crash-to-desktop ([#576](https://github.com/thewh1teagle/vibe/issues/576)); stuck-at-0% hangs ([#665](https://github.com/thewh1teagle/vibe/issues/665)).

### FUTO Voice Input (source-available, Android)

**Overview.** Privacy-first Android voice input (Whisper on-device, nothing leaves the phone) ([voiceinput.futo.org](https://voiceinput.futo.org/)). Free; optional $5 one-time license (shared with FUTO Keyboard) ([voiceinput.futo.org](https://voiceinput.futo.org/)). License is "FUTO Source First License 1.0" — source-available, **not** OSI open source ([github.com/futo-org/voice-input](https://github.com/futo-org/voice-input)).

**Top complaints.** 30-second recording limit per utterance; smaller models weak for low-training-hour languages; keyboard-integration quirks ([Play Store reviews](https://play.google.com/store/apps/details?id=org.futo.voiceinput&hl=en_US), [FUTO FAQ](https://docs.keyboard.futo.org/troubleshooting/faq)). Different platform (mobile) — not a direct CodeFlow competitor, but a useful privacy-culture reference.

### Other notable open-source/adjacent entrants (short list)

- **OpenWhispr** — MIT, Win/Mac/Linux, local Whisper/Parakeet + BYOK cloud; the most directly comparable OSS "Wispr Flow alternative" with Windows support ([github.com/OpenWhispr/openwhispr](https://github.com/OpenWhispr/openwhispr), 4.2k stars; [openwhispr.com](https://openwhispr.com/)).
- **Amical** — open-source AI dictation, local or cloud models, app-aware formatting ([amical.ai](https://amical.ai/compare/wispr-flow)).
- **VoiceTypr, Jarvis, Whispering** — smaller OSS options recurring in "open source Wispr Flow alternatives" roundups ([openalternative.co](https://openalternative.co/alternatives/wisprflow), [tryvoiceink roundup](https://tryvoiceink.com/best-wispr-flow-alternatives)).

---

## 4. Flaws to market against (cross-cutting)

1. **Word caps as a business model.** The two hottest venture-backed apps meter free usage by words: Wispr 2,000/week ([source](https://wisprflow.ai/pricing)), Aqua 1,000 *lifetime* ([source](https://aquavoice.com/)). Dictation is speech — capping words feels like capping talking.
2. **Subscription fatigue.** $96–180/yr forever (Aqua $96/yr, Wispr $144–180/yr) for a utility. HN sentiment explicitly prefers one-time payment ([HN](https://news.ycombinator.com/item?id=43634005)); even "one-time" competitors moved upmarket (Dragon $299→$699 [reported](https://usevoicy.com/blog/best-dragon-alternatives-2026); Superwhisper lifetime reprice reports — unverified, see §3).
3. **Cloud-only privacy exposure.** Wispr (audio + past screenshot context incident), Aqua (voice → OpenAI et al.), and even Windows' own Win+H all require sending speech to servers. The Wispr incident is the single most citable trust story in the category ([modelpiper](https://modelpiper.com/blog/wispr-flow-privacy-incident), [HN on Aqua](https://news.ycombinator.com/item?id=43634005), [voicetotext24 on Win+H](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24)).
4. **Account walls.** Wispr and Aqua require accounts even to use free tiers; CodeFlow requires nothing.
5. **The Windows gap.** MacWhisper, VoiceInk, Superwhisper's best experience = macOS. Dragon abandoned Mac but is $699 on Windows. Windows users' "good" options are a cloud built-in (Win+H) or young OSS. A polished, free, local, Windows-first app is genuinely differentiated.
6. **Trial-cliff distrust.** Recurring organic-review theme for Wispr: great in trial, worse after paying (Trustpilot cluster, [trustpilot.com/review/wisprflow.ai](https://www.trustpilot.com/review/wisprflow.ai) via [spokenly summary](https://spokenly.app/blog/wispr-flow-review)). Free-forever products are immune to this accusation.
7. **"Dictation as afterthought."** Whisper GUI apps (MacWhisper, Buzz, Vibe) are file-transcription tools whose dictation modes (if any) are laggy add-ons ([lumevoice on MacWhisper](https://lumevoice.com/blog/macwhisper-review-2026/)) — different job than press-key-speak-paste.
8. **Closed source where trust matters most.** After a privacy incident, "trust us, we changed it" is weaker than "read the code." Only VoiceInk (Mac), Handy/OpenWhispr/Amical occupy the open-source dictation niche today.

---

## 5. Messaging angles for CodeFlow's site

1. **"Dictation without a meter."** — Wispr free = 2,000 words/week; Aqua free = 1,000 words *ever*; CodeFlow = unlimited, free, forever ([wisprflow.ai/pricing](https://wisprflow.ai/pricing), [aquavoice.com](https://aquavoice.com/)).
2. **"Your voice never leaves your PC."** — Wispr and Aqua process audio in the cloud; Win+H requires internet; CodeFlow's whisper.cpp runs 100% locally ([Wispr docs](https://docs.wisprflow.ai/articles/3834764683-why-vpns-or-security-tools-can-block-wispr-flow), [HN on Aqua](https://news.ycombinator.com/item?id=43634005), [voicetotext24](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24)).
3. **"Don't trust us — read the source."** — MIT-licensed, auditable; contrast with a closed-source market leader that had a screenshot-upload privacy incident ([modelpiper](https://modelpiper.com/blog/wispr-flow-privacy-incident)).
4. **"$0 vs $144/year."** — Wispr Pro is $12/mo billed annually; CodeFlow is free with no Pro tier to upsell ([wisprflow.ai/pricing](https://wisprflow.ai/pricing)).
5. **"Finally, Windows-first."** — The polished local dictation apps are Mac-only (MacWhisper, VoiceInk); Dragon left Mac and costs $699 on Windows; CodeFlow is built for Windows ([tryvoiceink.com](https://tryvoiceink.com/), [Staples Dragon listing](https://www.staples.com/nuance-dragon-professional-v16-for-1-user-windows-download-sn-dp09a-g00-16-0/product_24581655)).
6. **"No account. No email. No card. Just talk."** — Wispr and Aqua both require sign-up before dictating; CodeFlow runs after install with zero registration ([wisprflow.ai/pricing](https://wisprflow.ai/pricing), [aquavoice.com](https://aquavoice.com/)).
7. **"Works on a plane."** — Fully offline STT; Win+H and Wispr stop working without internet ([voicetotext24](https://voicetotext24.com/articles/why-windows-dictation-sucks-use-voicetotext24), [Wispr docs](https://docs.wisprflow.ai/articles/3834764683-why-vpns-or-security-tools-can-block-wispr-flow)).
8. **"There's no trial to fall off."** — Organic reviews accuse subscription rivals of degrading after the trial ends; a free product can't bait-and-switch ([trustpilot.com/review/wisprflow.ai](https://www.trustpilot.com/review/wisprflow.ai)).
9. **"AI cleanup that can also be 100% local."** — OpenAI/Groq if you want speed, Ollama if you want privacy — competitors' AI formatting is cloud-only (Wispr, Aqua per their docs above).
10. **"Better Win+H."** — Same hold-a-key simplicity as the built-in, but offline, AI-cleaned, custom-vocabulary, with snippets and history — fixing Win+H's documented punctuation and connectivity complaints ([learn.microsoft.com](https://learn.microsoft.com/en-us/answers/questions/4009593/windows-11-dictation-feature-(win-h)-fails-to-cons)).

---

## Source reliability notes (read before publishing)

- **Primary/official (safe to cite):** wisprflow.ai/pricing, docs.wisprflow.ai, superwhisper.com, aquavoice.com (+ /download, /info/faq), tryvoiceink.com/pricing, goodsnooze.gumroad.com, talonvoice.com / talon.wiki / patreon.com/lunixbochs, dragon.nuance.com, Staples/CDW retail listings, all GitHub repos/issues, learn.microsoft.com, news.ycombinator.com threads, play.google.com, voiceinput.futo.org.
- **Competitor-run blogs (use with caution, verify before public claims):** getvoibe.com (Voibe), spokenly.app (Spokenly), usevoicy.com (Voicy), weesperneonflow.ai, vocai.net, embertype.com, modelpiper.com, speakmac.app, blazingfasttranscription.com, lumevoice.com, openwhispr.com/compare, tryvoiceink.com/best-wispr-flow-alternatives. Several appear AI-generated and may propagate each other's errors (e.g. the conflicting Superwhisper lifetime price).
- **Unresolved items to verify manually before the public table ships:** (1) Superwhisper lifetime price at checkout; (2) exact current MacWhisper Gumroad price (JS-rendered); (3) the original Reddit thread URL for the Wispr Flow screenshot incident (currently sourced via third-party writeups); (4) Talon beta Patreon tier exact price; (5) whether Wispr's Android "unlimited (limited time)" promo is still running at publish date.
