import { contextBridge, ipcRenderer } from 'electron'

type StatusPayload = { state: string; message?: string }
type OverlayPayload = { state: string; message?: string }
type RecorderCommand = { action: 'start' | 'stop' | 'cancel' }

const api = {
  // App / settings
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  setSecret: (name: string, value: string) => ipcRenderer.invoke('secret:set', name, value),
  getSecretStatus: (name: string) => ipcRenderer.invoke('secret:status', name),
  clearSecret: (name: string) => ipcRenderer.invoke('secret:clear', name),
  testProvider: (name: string) => ipcRenderer.invoke('provider:test', name),

  // Pipeline status (settings window)
  onStatus: (cb: (s: StatusPayload) => void) => {
    const listener = (_e: unknown, s: StatusPayload) => cb(s)
    ipcRenderer.on('pipeline:status', listener)
    return () => {
      ipcRenderer.removeListener('pipeline:status', listener)
    }
  },

  // Recorder window
  onRecord: (cb: (cmd: RecorderCommand) => void) => {
    ipcRenderer.on('recorder:command', (_e, cmd: RecorderCommand) => cb(cmd))
  },
  sendAudio: (data: ArrayBuffer, mime: string) => ipcRenderer.send('recorder:audio', { data, mime }),
  recorderError: (message: string) => ipcRenderer.send('recorder:error', message),

  // Overlay window
  onOverlayState: (cb: (s: OverlayPayload) => void) => {
    ipcRenderer.on('overlay:state', (_e, s: OverlayPayload) => cb(s))
  }
}

contextBridge.exposeInMainWorld('codeflow', api)

export type CodeflowApi = typeof api
