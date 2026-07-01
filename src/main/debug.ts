import { app } from 'electron'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

let logPath = ''
let enabled = false

/** Debug logging is OFF unless CODEFLOW_DEBUG=1 is set in the environment. */
export function initDebug(): void {
  enabled = process.env.CODEFLOW_DEBUG === '1'
  if (!enabled) return
  try {
    // OS temp dir — stable path regardless of app name, easy to locate.
    logPath = join(app.getPath('temp'), 'codeflow-debug.log')
  } catch {
    logPath = ''
  }
  dbg('==================== CodeFlow debug session ====================')
  dbg(`log file: ${logPath}`)
}

export function debugEnabled(): boolean {
  return enabled
}

export function dbg(msg: string): void {
  if (!enabled) return
  const line = `[${new Date().toISOString()}] ${msg}`
  // eslint-disable-next-line no-console
  console.log(line)
  try {
    if (logPath) appendFileSync(logPath, line + '\n')
  } catch {
    /* ignore */
  }
}

export function debugLogPath(): string {
  return logPath
}
