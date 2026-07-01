import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
let isQuitting = false

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL

/** Resolve a bundled resource (icons live in /resources in dev, and in resourcesPath when packaged). */
function resourcePath(...segments: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, ...segments)
    : join(__dirname, '..', '..', 'resources', ...segments)
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 760,
    height: 600,
    show: false,
    title: 'CodeFlow',
    backgroundColor: '#0f1020',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  // Closing the window hides it to the tray instead of quitting the app.
  settingsWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      settingsWindow?.hide()
    }
  })

  settingsWindow.once('ready-to-show', () => settingsWindow?.show())

  if (RENDERER_DEV_URL) {
    settingsWindow.loadURL(RENDERER_DEV_URL)
  } else {
    settingsWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'))
  }
}

function createTray(): void {
  const image = nativeImage.createFromPath(resourcePath('tray.png'))
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('CodeFlow')

  const menu = Menu.buildFromTemplate([
    { label: 'CodeFlow', enabled: false },
    { type: 'separator' },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { type: 'separator' },
    {
      label: 'Quit CodeFlow',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => createSettingsWindow())
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => createSettingsWindow())

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('ai.codeflow.app')
    registerIpc()
    createTray()
    // Phase 0: show the window on launch so there's something to see.
    // (Later phases start hidden and live purely in the tray.)
    createSettingsWindow()
  })

  // Tray app: keep the process alive when all windows are closed.
  app.on('window-all-closed', () => {
    // intentionally do not quit
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow()
  })

  app.on('before-quit', () => {
    isQuitting = true
  })
}
