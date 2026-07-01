import { uIOhook, UiohookKey } from 'uiohook-napi'
import { EventEmitter } from 'node:events'
import type { ModifierName } from './settings'

const CTRL = new Set<number>([UiohookKey.Ctrl, UiohookKey.CtrlRight])
const ALT = new Set<number>([UiohookKey.Alt, UiohookKey.AltRight])
const SHIFT = new Set<number>([UiohookKey.Shift, UiohookKey.ShiftRight])
const META = new Set<number>([UiohookKey.Meta, UiohookKey.MetaRight])

/**
 * Global push-to-talk detector built on a low-level keyboard hook.
 * Emits:
 *   'start'  when all required modifiers become held
 *   'stop'   when the chord is released
 *   'cancel' when Esc is pressed
 */
export class HotkeyManager extends EventEmitter {
  private down: Record<ModifierName, boolean> = { Ctrl: false, Alt: false, Shift: false, Meta: false }
  private required: ModifierName[]
  private engaged = false
  private hooked = false

  constructor(required: ModifierName[]) {
    super()
    this.required = required.length ? required : ['Ctrl', 'Alt']
  }

  setChord(required: ModifierName[]): void {
    this.required = required.length ? required : ['Ctrl', 'Alt']
  }

  start(): void {
    if (this.hooked) return
    this.hooked = true
    uIOhook.on('keydown', (e) => this.handle(e.keycode, true))
    uIOhook.on('keyup', (e) => this.handle(e.keycode, false))
    uIOhook.start()
  }

  stop(): void {
    try {
      uIOhook.stop()
    } catch {
      /* ignore */
    }
  }

  private handle(keycode: number, isDown: boolean): void {
    if (keycode === UiohookKey.Escape && isDown) {
      this.emit('cancel')
      return
    }
    if (CTRL.has(keycode)) this.down.Ctrl = isDown
    else if (ALT.has(keycode)) this.down.Alt = isDown
    else if (SHIFT.has(keycode)) this.down.Shift = isDown
    else if (META.has(keycode)) this.down.Meta = isDown
    else return // non-modifier keys don't affect the chord

    const active = this.required.every((m) => this.down[m])
    if (active && !this.engaged) {
      this.engaged = true
      this.emit('start')
    } else if (!active && this.engaged) {
      this.engaged = false
      this.emit('stop')
    }
  }
}
