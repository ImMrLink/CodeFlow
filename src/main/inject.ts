import { clipboard } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import { execFile } from 'node:child_process'
import { dbg } from './debug'

/**
 * Paste text into whatever window currently has focus.
 * Stash the user's clipboard, write our text, send Ctrl+V, then restore.
 * Primary path is a native keystroke via uiohook (no process spawn); SendKeys is the fallback.
 */
export async function injectText(text: string): Promise<void> {
  if (!text) return
  const previous = clipboard.readText()
  clipboard.writeText(text)
  await delay(30)
  try {
    uIOhook.keyTap(UiohookKey.V, [UiohookKey.Ctrl])
  } catch (e) {
    dbg(`[inject] native keyTap failed (${(e as Error).message}); using SendKeys fallback`)
    await sendCtrlVFallback()
  }
  // restore the user's clipboard shortly after the paste lands
  setTimeout(() => clipboard.writeText(previous), 500)
}

function sendCtrlVFallback(): Promise<void> {
  return new Promise((resolve) => {
    const ps = "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', ps],
      { windowsHide: true },
      () => resolve()
    )
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
