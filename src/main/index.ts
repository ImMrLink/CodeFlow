import { app, BrowserWindow, Tray, Menu, nativeImage, session } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { getSection } from './settings'
import { HotkeyManager } from './hotkey'
import { Recorder } from './recorder'
import { Overlay } from './overlay'
import { Pipeline, type PipelineStatus } from './pipeline'
import { initDebug, dbg, debugLogPath } from './debug'

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL
const PRELOAD = join(__dirname, '..', 'preload', 'index.js')

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let recorderWindow: BrowserWindow | null = null
let hotkeys: HotkeyManager | null = null
let pipeline: Pipeline | null = null
let isQuitting = false

function resourcePath(...segments: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, ...segments)
    : join(__dirname, '..', '..', 'resources', ...segments)
}

function loadRenderer(win: BrowserWindow, name: 'index' | 'overlay' | 'recorder'): void {
  const file = `${name}.html`
  if (RENDERER_DEV_URL) win.loadURL(`${RENDERER_DEV_URL}/${file}`)
  else win.loadFile(join(__dirname, '..', 'renderer', file))
}

function broadcastStatus(s: PipelineStatus): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('pipeline:status', s)
  }
}

function setupPermissions(): void {
  const allow = (p: string) => p === 'media' || p === 'audioCapture' || p === 'microphone'
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allow(permission)))
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allow(permission))
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 780,
    height: 720,
    show: false,
    title: 'CodeFlow',
    backgroundColor: '#0f1020',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  settingsWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      settingsWindow?.hide()
    }
  })
  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  loadRenderer(settingsWindow, 'index')
}

function createOverlayWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 280,
    height: 68,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true)
  loadRenderer(win, 'overlay')
  return win
}

function createRecorderWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 200,
    height: 200,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })
  loadRenderer(win, 'recorder')
  return win
}

function createTray(): void {
  const image = nativeImage.createFromPath(resourcePath('tray.png'))
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('CodeFlow — hold Ctrl+Alt to dictate')
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
    initDebug()
    dbg(`[app] ready. renderer dev url=${RENDERER_DEV_URL ?? '(none, packaged)'}`)
    setupPermissions()

    overlayWindow = createOverlayWindow()
    recorderWindow = createRecorderWindow()
    recorderWindow.webContents.on('did-finish-load', () => dbg('[recorder] window finished loading'))
    recorderWindow.webContents.on('did-fail-load', (_e, code, desc, url) =>
      dbg(`[recorder] window FAILED to load: ${code} ${desc} (${url})`)
    )
    overlayWindow.webContents.on('did-finish-load', () => dbg('[overlay] window finished loading'))
    const overlay = new Overlay(overlayWindow)
    const recorder = new Recorder(recorderWindow)
    pipeline = new Pipeline(recorder, overlay, broadcastStatus)

    hotkeys = new HotkeyManager(getSection('hotkey').pttModifiers)
    hotkeys.on('start', () => pipeline?.begin())
    hotkeys.on('stop', () => void pipeline?.finish())
    hotkeys.on('cancel', () => pipeline?.cancel())
    hotkeys.start()

    registerIpc({
      onHotkeyChanged: () => hotkeys?.setChord(getSection('hotkey').pttModifiers)
    })

    createTray()
    createSettingsWindow()
    dbg(`[app] startup complete. Debug log at: ${debugLogPath()}`)
  })

  // Tray app: keep the process alive when all windows are closed.
  app.on('window-all-closed', () => {
    /* intentionally do not quit */
  })

  app.on('before-quit', () => {
    isQuitting = true
    hotkeys?.stop()
  })
}
