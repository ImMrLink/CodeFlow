import { Recorder } from './recorder'
import { Overlay } from './overlay'
import { buildSttEngine } from './providers/stt'
import { buildLlmEngine } from './providers/llm'
import { injectText } from './inject'
import { getSection } from './settings'
import { addHistory } from './history'
import { dbg } from './debug'

export interface PipelineStatus {
  state: 'idle' | 'listening' | 'transcribing' | 'formatting' | 'injecting' | 'done' | 'error'
  message?: string
}

/** Orchestrates one dictation: record -> STT -> optional LLM cleanup -> inject. */
export class Pipeline {
  private busy = false
  private aborted = false

  constructor(
    private recorder: Recorder,
    private overlay: Overlay,
    private onStatus: (s: PipelineStatus) => void
  ) {}

  private status(state: PipelineStatus['state'], message?: string): void {
    this.onStatus({ state, message })
  }

  begin(): void {
    if (this.busy) {
      dbg('[pipeline] begin ignored (already busy)')
      return
    }
    this.busy = true
    this.aborted = false
    dbg('[pipeline] begin -> listening')
    this.overlay.set('listening', 'Listening…')
    this.status('listening')
    this.recorder.start()
  }

  async finish(): Promise<void> {
    if (!this.busy) {
      dbg('[pipeline] finish ignored (not busy)')
      return
    }
    dbg('[pipeline] finish -> stopping recorder')
    this.overlay.set('processing', 'Transcribing…')
    this.status('transcribing')

    const clip = await this.recorder.stop()
    dbg(`[pipeline] clip received: ${clip ? clip.buffer.length + ' bytes, ' + clip.mime : 'null'}`)
    if (this.aborted) return this.reset()
    if (!clip || clip.buffer.length < 1200) return this.fail('No audio captured')

    try {
      const stt = buildSttEngine()
      dbg(`[pipeline] transcribing via ${stt.id}`)
      const engineId = stt.id
      let text = (await stt.transcribe(clip.buffer, clip.mime)).text
      dbg(`[pipeline] transcript: ${text.length} chars`)
      if (this.aborted) return this.reset()
      if (!text) return this.fail('No speech detected')

      if (getSection('llm').enabled) {
        this.overlay.set('processing', 'Formatting…')
        this.status('formatting')
        try {
          text = await buildLlmEngine().clean(text)
        } catch (e) {
          // cleanup is best-effort; fall back to the raw transcript
          console.error('[pipeline] LLM cleanup failed, using raw text:', (e as Error).message)
        }
      }
      if (this.aborted) return this.reset()

      this.status('injecting')
      dbg('[pipeline] injecting text')
      await injectText(text)
      addHistory(text, engineId)
      this.overlay.set('hidden')
      this.status('done', text.slice(0, 100))
      dbg('[pipeline] done')
    } catch (e) {
      this.fail((e as Error).message)
    } finally {
      this.busy = false
    }
  }

  /** Hands-free mode: first press starts, next press finishes. */
  toggle(): void {
    if (this.busy) void this.finish()
    else this.begin()
  }

  cancel(): void {
    if (!this.busy) return
    this.aborted = true
    this.recorder.cancel()
    this.reset()
  }

  private fail(message: string): void {
    console.error('[pipeline]', message)
    this.overlay.set('error', message)
    this.status('error', message)
    setTimeout(() => this.overlay.set('hidden'), 2500)
    this.busy = false
  }

  private reset(): void {
    this.overlay.set('hidden')
    this.status('idle')
    this.busy = false
  }
}
