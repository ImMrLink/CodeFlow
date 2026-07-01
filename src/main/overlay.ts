import { BrowserWindow, screen } from 'electron'

export type OverlayState =
  | 'hidden'
  | 'listening'
  | 'transcribing'
  | 'formatting'
  | 'pasting'
  | 'done'
  | 'error'

/** Controls the bottom-center "Flow Bar" indicator window. */
export class Overlay {
  private win: BrowserWindow

  constructor(win: BrowserWindow) {
    this.win = win
  }

  private reposition(): void {
    const { workArea } = screen.getPrimaryDisplay()
    const [w, h] = this.win.getSize()
    this.win.setPosition(
      Math.round(workArea.x + (workArea.width - w) / 2),
      Math.round(workArea.y + workArea.height - h - 28)
    )
  }

  set(state: OverlayState, message = ''): void {
    if (this.win.isDestroyed()) return
    if (state === 'hidden') {
      this.win.hide()
      return
    }
    this.reposition()
    // show without stealing focus from the user's target app
    this.win.showInactive()
    this.win.webContents.send('overlay:state', { state, message })
  }
}
