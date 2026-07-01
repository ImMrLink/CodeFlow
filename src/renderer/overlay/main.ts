import './overlay.css'

const pill = document.getElementById('pill') as HTMLElement
const label = document.getElementById('label') as HTMLElement

window.codeflow.onOverlayState(({ state, message }) => {
  pill.className = `pill ${state}`
  label.textContent = message || state
})
