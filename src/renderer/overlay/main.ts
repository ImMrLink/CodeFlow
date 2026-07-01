import '@fontsource/ibm-plex-sans/500.css'
import './overlay.css'

const pill = document.getElementById('pill') as HTMLElement
const label = document.getElementById('label') as HTMLElement

window.codeflow.onOverlayState(({ state, message }) => {
  // CSS keys the visible indicator (wave/think/dots/check) off this class.
  pill.className = `pill ${state}`
  label.textContent = message || state
})
