import { clipboard } from 'electron'
import { execFile } from 'node:child_process'

/**
 * Paste text into whatever window currently has focus.
 * Strategy: stash the user's clipboard, write our text, send Ctrl+V, then restore.
 * Uses Windows SendKeys (dependency-free); a keystroke-typing fallback comes later.
 */
export async function injectText(text: string): Promise<void> {
  if (!text) return
  const previous = clipboard.readText()
  clipboard.writeText(text)
  // let the clipboard settle before pasting
  await delay(40)
  await sendCtrlV()
  // restore the user's clipboard shortly after the paste lands
  setTimeout(() => clipboard.writeText(previous), 500)
}

function sendCtrlV(): Promise<void> {
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
