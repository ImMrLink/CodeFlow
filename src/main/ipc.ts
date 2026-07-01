import { ipcMain, app, clipboard } from 'electron'
import * as settings from './settings'
import { testProviderKey, type ProviderName } from './providers/health'
import { getHistory, clearHistory } from './history'

export interface IpcDeps {
  /** Called when hotkey chord, activation mode, or autostart settings change. */
  onInputConfigChanged?: () => void
}

/** Registers all main-process IPC handlers exposed to the renderer via the preload bridge. */
export function registerIpc(deps: IpcDeps = {}): void {
  ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    encryptionAvailable: settings.encryptionAvailable()
  }))

  ipcMain.handle('settings:getAll', () => settings.getPublicSettings())

  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    settings.setValue(key, value)
    if (key.startsWith('hotkey') || key.startsWith('general')) deps.onInputConfigChanged?.()
    return settings.getPublicSettings()
  })

  ipcMain.handle('secret:set', (_e, name: string, value: string) => {
    settings.setSecret(name, value)
    return { ok: true, exists: true }
  })

  ipcMain.handle('secret:status', (_e, name: string) => ({
    exists: settings.hasSecret(name)
  }))

  ipcMain.handle('secret:clear', (_e, name: string) => {
    settings.clearSecret(name)
    return { ok: true, exists: false }
  })

  ipcMain.handle('provider:test', (_e, name: ProviderName) => testProviderKey(name))

  ipcMain.handle('history:get', () => getHistory())
  ipcMain.handle('history:clear', () => {
    clearHistory()
    return getHistory()
  })

  ipcMain.handle('clipboard:write', (_e, text: string) => {
    clipboard.writeText(text)
    return true
  })
}
