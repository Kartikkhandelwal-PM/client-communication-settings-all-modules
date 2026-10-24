import { buildData } from './data.js'

// Stand-ins for the real endpoints. Swap the bodies for fetch() calls; the shapes stay the same.
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// -> { clients, settings, defaults }  (see data.js for the shape)
export async function fetchSettings() {
  await wait(250)
  return buildData()
}

// every change is saved on its own
export async function saveSettings(payload) {
  await wait(250)
  return { ok: true }
}

// send one scheduled report to one registration's contact right now, whatever the switch says
export async function sendNow({ registrationId, key, channel }) {
  await wait(600)
  return { ok: true, registrationId, key, channel }
}
