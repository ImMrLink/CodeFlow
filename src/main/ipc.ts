import { ipcMain, app, clipboard } from 'electron'
import * as settings from './settings'
import { testProviderKey, testOllama, type ProviderName } from './providers/health'
import { getHistory, clearHistory } from './history'
import { ensureReady, localStatus } from './providers/localWhisper'

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

  ipcMain.handle('provider:test', (_e, name: string) => {
    if (name === 'ollama') return testOllama(settings.getSection('llm').ollamaEndpoint)
    return testProviderKey(name as ProviderName)
  })

  ipcMain.handle('history:get', () => getHistory())
  ipcMain.handle('history:clear', () => {
    clearHistory()
    return getHistory()
  })

  ipcMain.handle('clipboard:write', (_e, text: string) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('local:status', () => localStatus(settings.getSection('stt').localModel))

  ipcMain.handle('local:ensure', async (e) => {
    const model = settings.getSection('stt').localModel
    try {
      await ensureReady(model, (msg) => e.sender.send('local:progress', msg))
      return { ok: true, ...localStatus(model) }
    } catch (err) {
      return { ok: false, message: (err as Error).message, ...localStatus(model) }
    }
  })
}
