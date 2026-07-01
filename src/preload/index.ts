import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  setSecret: (name: string, value: string) => ipcRenderer.invoke('secret:set', name, value),
  getSecretStatus: (name: string) => ipcRenderer.invoke('secret:status', name),
  clearSecret: (name: string) => ipcRenderer.invoke('secret:clear', name)
}

contextBridge.exposeInMainWorld('codeflow', api)

export type CodeflowApi = typeof api
