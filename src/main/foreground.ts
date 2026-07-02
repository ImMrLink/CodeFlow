import { execFile } from 'node:child_process'

// Friendly names for common process names (lowercased, no .exe).
const FRIENDLY: Record<string, string> = {
  chrome: 'Chrome',
  msedge: 'Edge',
  firefox: 'Firefox',
  code: 'VS Code',
  'code - insiders': 'VS Code',
  windowsterminal: 'Terminal',
  powershell: 'Terminal',
  pwsh: 'Terminal',
  cmd: 'Terminal',
  slack: 'Slack',
  discord: 'Discord',
  notion: 'Notion',
  obsidian: 'Obsidian',
  outlook: 'Outlook',
  winword: 'Word',
  excel: 'Excel',
  teams: 'Teams',
  'ms-teams': 'Teams',
  explorer: 'File Explorer',
  notepad: 'Notepad',
  devenv: 'Visual Studio',
  idea64: 'IntelliJ',
  cursor: 'Cursor'
}

const friendly = (proc: string): string => {
  const key = proc.toLowerCase().replace(/\.exe$/, '')
  return FRIENDLY[key] ?? proc.charAt(0).toUpperCase() + proc.slice(1)
}

const PS = [
  '$s = Add-Type -PassThru -Name FgWin -MemberDefinition \'',
  '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
  '[DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);\';',
  '$h = $s::GetForegroundWindow(); $p = 0; [void]$s::GetWindowThreadProcessId($h, [ref]$p);',
  '(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName'
].join(' ')

/**
 * Best-effort: return a friendly name for the app that currently has focus.
 * Resolves to '' on any failure — never throws, never blocks the caller.
 */
export function getForegroundApp(): Promise<string> {
  return new Promise((resolve) => {
    try {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', PS],
        { windowsHide: true, timeout: 4000 },
        (err, stdout) => {
          if (err || !stdout) return resolve('')
          const proc = stdout.trim().split('\n')[0]?.trim()
          resolve(proc ? friendly(proc) : '')
        }
      )
    } catch {
      resolve('')
    }
  })
}
