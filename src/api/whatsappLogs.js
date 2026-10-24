import { buildData, CATALOG, contactOf, MOD_KEYS, registrationsOf } from './data.js'

// only modules that have reports or events can send messages, so only they show up in the logs
export const LOG_MODS = MOD_KEYS.filter((m) => CATALOG[m].length)

// WhatsApp logs (sample data) for GST, TDS and ITR. Every message goes out through Rampwin; the real fields still
// have to be matched with Rampwin's API / webhook.
//
// Bulk messages: anything that goes to everyone at a scheduled time. A "run" is one go at it, for example the
// GSTR-2A / 2B report on one day. It records how many clients were targeted and what happened to each message.
export const STATUSES = {
  sent: { label: 'Sent', tone: 'amber', help: 'Handed over to WhatsApp, not yet on the client\'s phone' },
  delivered: { label: 'Delivered', tone: 'green', help: 'Reached the client\'s phone' },
  read: { label: 'Read', tone: 'blue', help: 'The client opened the message' },
  failed: { label: 'Failed', tone: 'red', help: 'Could not be delivered' },
}
export const STATUS_ORDER = ['sent', 'delivered', 'read', 'failed']
export const RETENTION_DAYS = 60
export const REASONS = ['Number is not on WhatsApp', 'Client has not opted in', 'Message template rejected', 'Phone switched off for a long time', 'Rate limit reached, try later']

// DEMO trigger events. The real lists come from the domain team.
// Bulk: sent to everyone together at a scheduled time. The first one is the scheduled GSTR-2A / 2B report.
export const SCHEDULED = { value: '2b', label: 'GSTR-2A / 2B report', module: 'gst' }
export const BULK_EVENTS = [

  SCHEDULED,
  { value: 'gstr2b', label: 'GSTR-2B data updated', module: 'gst' },
  { value: 'due', label: 'Return due date reminder', module: 'gst' },
  { value: 'tdssum', label: 'Monthly TDS summary', module: 'tds' },
  { value: 'refund', label: 'Refund issued', module: 'itr' },
].filter((e) => LOG_MODS.includes(e.module))
// Single: sent to one client when something happens or is completed (or with the send button)
export const SINGLE_EVENTS = [
  { label: 'GSTR-2A / 2B report', module: 'gst' }, { label: 'New GST notice received', module: 'gst' }, { label: 'ITC mismatch found', module: 'gst' },
  { label: 'GSTR-1 filing completed', module: 'gst' }, { label: 'Payment received', module: 'gst' },
  { label: 'Form 16 generated', module: 'tds' }, { label: 'Form 16A generated', module: 'tds' }, { label: 'Default notice received', module: 'tds' },
  { label: 'ITR e-verified', module: 'itr' }, { label: 'Intimation received', module: 'itr' },
].filter((e) => LOG_MODS.includes(e.module))

// small seeded random so the same run always shows the same messages
const seeded = (seed) => { let s = seed % 2147483647 || 1; return () => ((s = (s * 48271) % 2147483647) / 2147483647) }

// the people messages go to: one entry per registration that has a mobile number
const people = (() => {
  const out = Object.fromEntries(MOD_KEYS.map((m) => [m, []]))
  for (const c of buildData().clients) for (const { m, r } of registrationsOf(c)) { const mobile = contactOf(c, r).mobile; if (mobile) out[m].push({ client: c.name, regId: r.id, mobile }) }
  return out
})()
const NOW = new Date()

function makeRuns() {
  const rnd = seeded(11), runs = []
  for (let d = 0; d < RETENTION_DAYS; d++) {
    const day = new Date(NOW); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - d)
    const add = (ev, hour, min) => {
      const at = new Date(day); at.setHours(hour, min, Math.floor(rnd() * 60))
      if (at > NOW) return
      const targeted = Math.floor(120 + rnd() * 380), fresh = (NOW - at) < 3 * 3600e3
      const sent = fresh ? Math.round(targeted * (0.05 + rnd() * 0.12)) : Math.round(targeted * rnd() * 0.01)
      const failed = Math.round(targeted * (0.005 + rnd() * 0.02))
      const rest = targeted - sent - failed
      const read = Math.round(rest * (fresh ? 0.2 : 0.55 + rnd() * 0.25))
      runs.push({ event: ev.label, module: ev.module, at, targeted, sent, failed, read, delivered: rest - read })
    }
    if (BULK_EVENTS.includes(SCHEDULED)) add(SCHEDULED, 10, 0)
    BULK_EVENTS.filter((e) => e !== SCHEDULED).forEach((e, i) => { if (rnd() < 0.12) add(e, 9 + i * 2, Math.floor(rnd() * 55)) })
  }
  runs.sort((a, b) => b.at - a.at)
  runs.forEach((r, i) => { r.id = `WR-${300 - i}`; r.rate = r.targeted ? Math.round(((r.delivered + r.read) / r.targeted) * 100) : 0 })
  return runs
}
const RUNS = makeRuns()

// every message of one run, with a status that adds up to the run's numbers
export function runMessages(run) {
  const rnd = seeded(run.id.split('-')[1] * 97), list = [], pool = people[run.module]
  for (const [status, n] of [['read', run.read], ['delivered', run.delivered], ['sent', run.sent], ['failed', run.failed]]) for (let i = 0; i < n; i++) list.push(status)
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
  const offset = Math.floor(rnd() * pool.length)
  return list.map((status, i) => {
    const p = pool[(i + offset) % pool.length]
    const sentAt = new Date(run.at.getTime() + Math.floor(i * 400 + rnd() * 400))
    const delivered = status === 'delivered' || status === 'read' ? new Date(sentAt.getTime() + 2000 + rnd() * 90e3) : null
    return { id: `${run.id}-${i + 1}`, ...p, status, sentAt, deliveredAt: delivered,
      readAt: status === 'read' ? new Date(delivered.getTime() + 60e3 + rnd() * 5 * 3600e3) : null,
      reason: status === 'failed' ? REASONS[Math.floor(rnd() * REASONS.length)] : '' }
  })
}

// single messages: the send-now clicks made on the settings page are added here
const SINGLES = (() => {
  const rnd = seeded(5)
  return Array.from({ length: SINGLE_EVENTS.length ? 30 : 0 }, (_, i) => {
    const ev = SINGLE_EVENTS[Math.floor(rnd() * SINGLE_EVENTS.length)], pool = people[ev.module], p = pool[Math.floor(rnd() * pool.length)]
    const at = new Date(NOW.getTime() - (i * 5 + rnd() * 5) * 3600e3)
    const status = rnd() < 0.6 ? 'read' : rnd() < 0.7 ? 'delivered' : rnd() < 0.5 ? 'sent' : 'failed'
    return { id: `WS-${600 - i}`, ...p, module: ev.module, event: ev.label, by: ev.label === 'GSTR-2A / 2B report' ? ['Neha Gupta', 'Rahul Verma', 'Amit Shah'][i % 3] : 'System',
      status, sentAt: at, deliveredAt: status === 'delivered' || status === 'read' ? new Date(at.getTime() + 8000) : null,
      readAt: status === 'read' ? new Date(at.getTime() + 3600e3) : null, reason: status === 'failed' ? REASONS[Math.floor(rnd() * REASONS.length)] : '' }
  })
})()
let singleSeq = 601
export function addSingleLog({ client, module, regId, mobile, event }) {
  SINGLES.unshift({ id: `WS-${singleSeq++}`, client, module, regId, mobile, event, by: 'You', status: 'sent', sentAt: new Date(), deliveredAt: null, readAt: null, reason: '' })
}

// The next scheduled GSTR-2A / 2B report: when it runs, and how many registrations it will target right now.
// The settings page keeps the number up to date.
let upcoming = { targeted: null }
const listeners = new Set()
export const setUpcomingTargets = (n) => { if (upcoming.targeted !== n) { upcoming = { targeted: n }; listeners.forEach((f) => f()) } }
export const subscribeUpcoming = (f) => { listeners.add(f); return () => listeners.delete(f) }
export const getUpcoming = () => upcoming
export function nextRunAt() {
  const d = new Date(); d.setHours(10, 0, 0, 0)
  if (d <= new Date()) d.setDate(d.getDate() + 1)
  return d
}

// Stand-ins for the real endpoints
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
export async function fetchRuns() { await wait(150); return RUNS }
export async function fetchSingles() { await wait(100); return [...SINGLES] }

export const fmt = (d) => (d ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtSec = (d) => (d ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')

export function toCsv(cols, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.map((c) => esc(c.label)).join(','), ...rows.map((r) => cols.map((c) => esc(c.value(r))).join(','))].join('\n')
}
export function downloadCsv(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}
