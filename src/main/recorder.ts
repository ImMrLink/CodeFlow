import { BrowserWindow, ipcMain } from 'electron'

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
      this.resolve(
        payload.data && payload.data.byteLength > 0
          ? { buffer: Buffer.from(payload.data), mime: payload.mime }
          : null
      )
    })
    ipcMain.on('recorder:error', (_e, message: string) => {
      console.error('[recorder]', message)
      this.resolve(null)
    })
  }

  private resolve(clip: AudioClip | null): void {
    const cb = this.pending
    this.pending = null
    if (cb) cb(clip)
  }

  private send(action: 'start' | 'stop' | 'cancel'): void {
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
        if (this.pending === resolve) this.resolve(null)
      }, 15000)
    })
  }

  cancel(): void {
    this.send('cancel')
    this.resolve(null)
  }
}
