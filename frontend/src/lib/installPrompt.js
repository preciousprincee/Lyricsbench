// Captures the browser's `beforeinstallprompt` event as early as possible.
//
// This module must be imported before React renders anything (see
// main.jsx) — the event commonly fires within the first second of page
// load, often before the user has navigated to Settings at all. If nothing
// is listening yet when it fires, the browser does not re-fire it later,
// so a listener attached only inside the Settings component (mounted on
// navigation, potentially much later) can miss it entirely. Capturing it
// here, at module load time, and handing it out to whichever component
// asks — regardless of mount order — fixes that.

let capturedEvent = null
let installed = false
const listeners = new Set()

function notify() {
  listeners.forEach((cb) => cb({ canInstall: !!capturedEvent, installed }))
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  capturedEvent = e
  notify()
})

window.addEventListener('appinstalled', () => {
  installed = true
  capturedEvent = null
  notify()
})

export function getInstallState() {
  return { canInstall: !!capturedEvent, installed }
}

export function subscribeInstallState(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export async function promptInstall() {
  if (!capturedEvent) return
  capturedEvent.prompt()
  await capturedEvent.userChoice
  capturedEvent = null
  notify()
}
