import { BrowserWindow, ipcMain } from 'electron'
import { dbg } from './debug'

export interface AudioClip {
  buffer: Buffer
  mime: string
}

/**
 * Drives the hidden recorder renderer (which owns the microphone + MediaRecorder).
 * Only one recording runs at a time.
 */
export class Recorder {
  private win: BrowserWindow
  private pending: ((clip: AudioClip | null) => void) | null = null

  constructor(win: BrowserWindow) {
    this.win = win
    ipcMain.on('recorder:audio', (_e, payload: { data: ArrayBuffer; mime: string }) => {
      dbg(`[recorder] audio received: ${payload.data?.byteLength ?? 0} bytes (${payload.mime})`)
      this.resolve(
        payload.data && payload.data.byteLength > 0
          ? { buffer: Buffer.from(payload.data), mime: payload.mime }
          : null
      )
    })
    ipcMain.on('recorder:error', (_e, message: string) => {
      dbg(`[recorder] ERROR: ${message}`)
      this.resolve(null)
    })
    ipcMain.on('recorder:log', (_e, message: string) => {
      dbg(`[recorder-renderer] ${message}`)
    })
  }

  private resolve(clip: AudioClip | null): void {
    const cb = this.pending
    this.pending = null
    if (cb) cb(clip)
  }

  private send(action: 'start' | 'stop' | 'cancel'): void {
    dbg(`[recorder] -> command '${action}' (win destroyed=${this.win.isDestroyed()})`)
    if (!this.win.isDestroyed()) this.win.webContents.send('recorder:command', { action })
  }

  start(): void {
    this.send('start')
  }

  stop(): Promise<AudioClip | null> {
    return new Promise((resolve) => {
      this.pending = resolve
      this.send('stop')
      // safety timeout so the pipeline never hangs
      setTimeout(() => {
        if (this.pending === resolve) {
          dbg('[recorder] stop() timed out after 15s (no audio from renderer)')
          this.resolve(null)
        }
      }, 15000)
    })
  }

  cancel(): void {
    this.send('cancel')
    this.resolve(null)
  }
}
