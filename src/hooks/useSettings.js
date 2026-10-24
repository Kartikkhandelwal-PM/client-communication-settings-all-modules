import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSettings, saveSettings } from '../api/settings.js'
import { CATALOG, CHANNELS, MOD_KEYS, MODULES, contactOf, hasChannel, indexRegistrations, itemOf, itemsOf } from '../api/data.js'

const clone = (o) => JSON.parse(JSON.stringify(o))
const setCh = (settings, rid, k, ch, v) => ({ ...settings, [rid]: { ...settings[rid], [k]: { ...settings[rid][k], [ch]: v } } })

// A registration cannot keep a channel on when its contact has no email / no mobile number.
function trimToContact(settings, client, reg) {
  const ct = contactOf(client, reg)
  const cur = settings[reg.id]
  let changed = false, next = {}
  for (const k in cur) {
    const s = { ...cur[k] }
    if (!ct.email && s.email) { s.email = false; changed = true }
    if (!ct.mobile && s.wa) { s.wa = false; changed = true }
    next[k] = s
  }
  return changed ? { ...settings, [reg.id]: next } : settings
}

// All settings data and every edit. Each change is saved on its own a moment after it is made (no Save button).
// `saveInfo` changes after each save so the page can say "Saved".
export default function useSettings() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [saveInfo, setSaveInfo] = useState(null)
  const first = useRef(true)

  useEffect(() => { fetchSettings().then((d) => { setData(d); first.current = true }).catch((e) => setError(e.message)) }, [])
  useEffect(() => {
    if (!data) return
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => saveSettings(data).then(() => setSaveInfo({ at: Date.now() })).catch((e) => setSaveInfo({ at: Date.now(), error: e.message })), 400)
    return () => clearTimeout(t)
  }, [data])

  const index = useMemo(() => (data ? indexRegistrations(data.clients) : new Map()), [data?.clients])
  const latest = useRef(null)
  latest.current = { data, index }
  const update = useCallback((fn) => setData((d) => fn(d)), [])

  // one switch, on a registration or in the defaults for new clients
  const setSwitch = useCallback((scope, k, ch, v) => update((d) => scope.rid
    ? { ...d, settings: setCh(d.settings, scope.rid, k, ch, v) }
    : { ...d, defaults: { ...d.defaults, [scope.module]: { ...d.defaults[scope.module], [k]: { ...d.defaults[scope.module][k], [ch]: v } } } }), [update])

  // every message of one group, on or off
  const setGroup = useCallback((scope, module, group, v, only) => update((d) => {
    const g = CATALOG[module].find((x) => x.name === group)
    const hit = scope.rid ? latest.current.index.get(scope.rid) : null
    const ct = hit ? contactOf(hit.c, hit.r) : null
    let store = scope.rid ? { ...d.settings[scope.rid] } : { ...d.defaults[scope.module] }
    for (const i of g.items) {
      const ch = i.ch || CHANNELS
      const cell = { ...store[i.k] }
      if ((!only || only === 'email') && ch.includes('email') && (!ct || ct.email)) cell.email = v
      if ((!only || only === 'wa') && ch.includes('wa') && (!ct || ct.mobile)) cell.wa = v
      store[i.k] = cell
    }
    return scope.rid ? { ...d, settings: { ...d.settings, [scope.rid]: store } } : { ...d, defaults: { ...d.defaults, [scope.module]: store } }
  }), [update])

  // use the client's contact (contactId = null) or another contact of the client for one registration
  const pickContact = useCallback((rid, contactId) => update((d) => {
    const { c } = latest.current.index.get(rid)
    const clients = d.clients.map((cl) => cl.id !== c.id ? cl : { ...cl, regs: Object.fromEntries(MOD_KEYS.map((m) => [m, cl.regs[m].map((r) => r.id === rid ? { ...r, c: contactId } : r)])) })
    const nc = clients.find((x) => x.id === c.id), reg = Object.values(nc.regs).flat().find((r) => r.id === rid)
    return { ...d, clients, settings: trimToContact(d.settings, nc, reg) }
  }), [update])

  // edit a contact (changes it everywhere it is used) or add a new one (and pick it for this registration)
  const saveContact = useCallback((rid, mode, form) => {
    const { c, r } = latest.current.index.get(rid)
    const ct = contactOf(c, r)
    update((d) => {
      let clients = d.clients.map((cl) => {
        if (cl.id !== c.id) return cl
        if (mode === 'edit') return { ...cl, contacts: cl.contacts.map((x) => x.id === ct.id ? { ...x, ...form } : x) }
        const id = 'n' + (cl.contacts.length + 1)
        const regs = Object.fromEntries(MOD_KEYS.map((m) => [m, cl.regs[m].map((x) => x.id === rid ? { ...x, c: id } : x)]))
        return { ...cl, contacts: [...cl.contacts, { id, ...form }], regs }
      })
      const nc = clients.find((x) => x.id === c.id)
      let settings = d.settings
      for (const reg of Object.values(nc.regs).flat()) settings = trimToContact(settings, nc, reg)
      return { ...d, clients, settings }
    })
  }, [update])

  const copyToOthers = useCallback((rid) => {
    const { c, r, m } = latest.current.index.get(rid)
    const others = c.regs[m].filter((x) => x.id !== r.id)
    update((d) => {
      let settings = d.settings
      for (const x of others) { settings = { ...settings, [x.id]: clone(settings[r.id]) }; settings = trimToContact(settings, c, x) }
      return { ...d, settings }
    })
    return others.length
  }, [update])

  const applyDefaults = useCallback((module) => {
    let n = 0
    update((d) => {
      let settings = d.settings
      for (const c of d.clients) for (const r of c.regs[module]) { settings = { ...settings, [r.id]: clone(d.defaults[module]) }; settings = trimToContact(settings, c, r) }
      return { ...d, settings }
    })
    for (const c of latest.current.data.clients) n += c.regs[module].length
    return n
  }, [update])

  // turn one message on or off, for the chosen channel(s), on every selected registration of its module
  const bulk = useCallback((ids, module, k, channel, on) => {
    const { index } = latest.current, it = itemOf(module, k)
    let hit = 0, skip = 0, other = 0
    const todo = []
    for (const rid of ids) {
      const f = index.get(rid)
      if (f.m !== module) { other++; continue }
      const ct = contactOf(f.c, f.r), chs = []
      for (const ch of CHANNELS) if ((channel === 'both' || channel === ch) && it.ch.includes(ch) && (!on || hasChannel(ct, ch))) chs.push(ch)
      if (chs.length) { hit++; todo.push([rid, chs]) } else skip++
    }
    update((d) => {
      let settings = d.settings
      for (const [rid, chs] of todo) for (const ch of chs) settings = setCh(settings, rid, k, ch, on)
      return { ...d, settings }
    })
    return { hit, skip, other }
  }, [update])

  return { data, error, saveInfo, index, setSwitch, setGroup, pickContact, saveContact, copyToOthers, applyDefaults, bulk }
}
