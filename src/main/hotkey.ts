import { uIOhook, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import { EventEmitter } from 'node:events'
import type { ModifierName } from './settings'
import { dbg, debugEnabled } from './debug'

const CTRL = new Set<number>([UiohookKey.Ctrl, UiohookKey.CtrlRight])
const ALT = new Set<number>([UiohookKey.Alt, UiohookKey.AltRight])
const SHIFT = new Set<number>([UiohookKey.Shift, UiohookKey.ShiftRight])
const META = new Set<number>([UiohookKey.Meta, UiohookKey.MetaRight])

function modifierOf(keycode: number): ModifierName | null {
  if (CTRL.has(keycode)) return 'Ctrl'
  if (ALT.has(keycode)) return 'Alt'
  if (SHIFT.has(keycode)) return 'Shift'
  if (META.has(keycode)) return 'Meta'
  return null
}

/**
 * Global push-to-talk detector built on a low-level keyboard hook.
 * Emits 'start' when all required modifiers are held, 'stop' on release, 'cancel' on Esc.
 * Non-modifier keys are never inspected or logged.
 */
export type ActivationMode = 'push-to-talk' | 'toggle'

export class HotkeyManager extends EventEmitter {
  private down: Record<ModifierName, boolean> = { Ctrl: false, Alt: false, Shift: false, Meta: false }
  private required: ModifierName[]
  private mode: ActivationMode
  private engaged = false
  private hooked = false

  constructor(required: ModifierName[], mode: ActivationMode = 'push-to-talk') {
    super()
    this.required = required.length ? required : ['Ctrl', 'Alt']
    this.mode = mode
  }

  setChord(required: ModifierName[]): void {
    this.required = required.length ? required : ['Ctrl', 'Alt']
    dbg(`[hotkey] chord set to ${this.required.join('+')}`)
  }

  setMode(mode: ActivationMode): void {
    this.mode = mode
    this.engaged = false
    dbg(`[hotkey] activation mode set to ${mode}`)
  }

  start(): void {
    if (this.hooked) return
    this.hooked = true
    uIOhook.on('keydown', (e) => this.handle(e, true))
    uIOhook.on('keyup', (e) => this.handle(e, false))
    try {
      uIOhook.start()
      dbg(`[hotkey] hook started, chord=${this.required.join('+')}`)
    } catch (e) {
      dbg(`[hotkey] uIOhook.start() FAILED: ${(e as Error).message}`)
    }
  }

  stop(): void {
    try {
      uIOhook.stop()
    } catch {
      /* ignore */
    }
  }

  private handle(e: UiohookKeyboardEvent, isDown: boolean): void {
    const keycode = e.keycode

    if (keycode === UiohookKey.Escape) {
      if (isDown) {
        dbg('[hotkey] Escape -> cancel')
        this.emit('cancel')
      }
      return
    }

    const mod = modifierOf(keycode)
    if (!mod) return // non-modifier keys don't affect the chord

    // ignore auto-repeat: only act when the modifier's state actually changes
    if (this.down[mod] === isDown) return
    this.down[mod] = isDown
    if (debugEnabled()) dbg(`[hotkey] ${mod} ${isDown ? 'down' : 'up'}`)

    const active = this.required.every((m) => this.down[m])
    if (active && !this.engaged) {
      this.engaged = true
      if (this.mode === 'toggle') {
        dbg(`[hotkey] chord (${this.required.join('+')}) -> toggle`)
        this.emit('toggle')
      } else {
        dbg(`[hotkey] chord ENGAGED (${this.required.join('+')}) -> start`)
        this.emit('start')
      }
    } else if (!active && this.engaged) {
      this.engaged = false
      if (this.mode === 'push-to-talk') {
        dbg('[hotkey] chord released -> stop')
        this.emit('stop')
      }
    }
  }
}
