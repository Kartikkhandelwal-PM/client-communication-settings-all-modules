import { useEffect, useMemo, useRef, useState } from 'react'
import useSettings from '../hooks/useSettings.js'
import { MODULES, MOD_KEYS, contactOf, countsFor, itemOf, itemsOf, registrationsOf, regTag } from '../api/data.js'
import { sendNow } from '../api/settings.js'
import { addSingleLog, setUpcomingTargets } from '../api/whatsappLogs.js'
import { Icon, ChannelIcon, MultiFilterButton, Pager, useToast } from './ui.jsx'
import { Avatar, AvatarStack, ModuleTag } from './Avatar.jsx'
import RegistrationPanel from './RegistrationPanel.jsx'
import DefaultsPanel from './DefaultsPanel.jsx'
import MultiPick from './MultiPick.jsx'

const PAGE_SIZES = [10, 25, 50]
const FILTERS0 = { q: '', module: [], type: [], contact: [] }
// options of the bulk bar: only scheduled reports, or only events, grouped by module (events also by their group)
// only the modules of the selected registrations are offered; the module name is added only when there are several
const bulkGroups = (kind, mods) => mods.flatMap((m) => {
  const items = itemsOf(m).filter((i) => i.rep === (kind === 'report'))
  const names = [...new Set(items.map((i) => i.group))], many = mods.length > 1
  return kind === 'report' ? [{ m, label: many ? MODULES[m].label : 'Scheduled reports', items }] : names.map((g) => ({ m, label: many ? `${MODULES[m].label} · ${g}` : g, items: items.filter((i) => i.group === g) }))
}).filter((g) => g.items.length)
const GST_SHOWN = 5 // a client with more GSTINs shows this many until "Show all"

// A checkbox that can show the "some selected" state
const Check = ({ checked, some, onChange, label }) => (
  <input className="cb" type="checkbox" checked={checked} ref={(el) => el && (el.indeterminate = !!some && !checked)} onChange={(e) => onChange(e.target.checked)} onClick={(e) => e.stopPropagation()} aria-label={label} />
)

export default function SettingsPage() {
  const s = useSettings()
  const [f, setF] = useState(FILTERS0)
  const [page, setPage] = useState(0)
  const [per, setPer] = useState(25)
  const [open, setOpen] = useState(() => new Set())
  const [showAll, setShowAll] = useState(() => new Set())
  const [sel, setSel] = useState(() => new Set())
  const [bulk, setBulk] = useState({ kind: 'report', msg: '', msgs: [], ch: 'both' })
  const [panel, setPanel] = useState(null)       // registration id
  const [defaultsOpen, setDefaultsOpen] = useState(false)
  const [toast, show] = useToast()
  const lastMsg = useRef({ msg: '', at: 0 })
  const say = (msg) => { lastMsg.current = { msg: msg.endsWith('.') ? msg : '', at: Date.now() }; show(msg) }

  const clients = s.data?.clients ?? [], settings = s.data?.settings
  // the next scheduled GSTR-2A / 2B report: tell the WhatsApp Logs page how many registrations it will target
  useEffect(() => {
    if (!s.data) return
    let n = 0
    for (const c of s.data.clients) for (const r of c.regs.gst) if (s.data.settings[r.id].r2ab.wa && contactOf(c, r).mobile) n++
    setUpcomingTargets(n)
  }, [s.data])
  // each change saves by itself; add "Saved" to the message of the action that caused it
  useEffect(() => {
    if (!s.saveInfo) return
    if (s.saveInfo.error) return say(`Could not save: ${s.saveInfo.error}`)
    const recent = lastMsg.current.msg && Date.now() - lastMsg.current.at < 3000
    say(recent ? `${lastMsg.current.msg} Saved.` : 'Saved')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.saveInfo])
  useEffect(() => setPage(0), [f, per])

  // every type that exists in the data, per module (GST: Regular, Composition. ITR: Company, Firm...). TDS has none yet.
  const typeOptions = useMemo(() => {
    const n = new Map()
    for (const c of clients) for (const { m, r } of registrationsOf(c)) if (r.type) n.set(`${m}:${r.type}`, (n.get(`${m}:${r.type}`) || 0) + 1)
    return [...n].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => { const [m, t] = value.split(':'); return { value, label: `${MODULES[m].label} · ${t}`, count } })
  }, [clients])
  const list = useMemo(() => {
    if (!settings) return []
    const q = f.q.trim().toLowerCase()
    return clients.map((c) => ({
      c,
      regs: registrationsOf(c).filter(({ m, r }) => {
        if (f.module.length && !f.module.includes(m)) return false
        if (f.type.length && !f.type.includes(`${m}:${r.type}`)) return false
        const ct = contactOf(c, r)
        if (q && !(c.name + c.pan + r.id + r.label + ct.name + ct.email + ct.mobile).toLowerCase().includes(q)) return false
        if (f.contact.length && !((f.contact.includes('noemail') && !ct.email) || (f.contact.includes('nomobile') && !ct.mobile))) return false
        return true
      }),
    })).filter((x) => x.regs.length)
  }, [clients, settings, f])

  if (s.error) return <main className="page"><div className="alert">Could not load settings: {s.error}</div></main>
  if (!s.data) return <main className="page"><div className="empty"><div className="spinner" />Loading settings…</div></main>

  const pages = Math.max(1, Math.ceil(list.length / per)), pg = Math.min(page, pages - 1)
  const slice = list.slice(pg * per, (pg + 1) * per)
  const nreg = list.reduce((a, x) => a + x.regs.length, 0)
  const pageIds = slice.flatMap((x) => x.regs.map((y) => y.r.id))
  const counts = Object.fromEntries(MOD_KEYS.map((m) => [m, clients.reduce((a, c) => a + c.regs[m].length, 0)]))
  const set = (patch) => setF({ ...f, ...patch })
  const toggle = (set_, id) => set_((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectIds = (ids, on) => setSel((p) => { const n = new Set(p); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n })

  const found = panel ? s.index.get(panel) : null
  const selMods = MOD_KEYS.filter((m) => [...sel].some((id) => s.index.get(id)?.m === m))
  const scopeReg = { rid: panel }
  const offered = bulkGroups(bulk.kind, selMods)

  const doBulk = (on) => {
    const word = on ? 'on' : 'off'
    if (bulk.kind === 'event') {
      const keys = bulk.msgs.filter((v) => offered.some((g) => g.items.some((i) => `${g.m}:${i.k}` === v)))
      if (!keys.length) return say('Choose at least one event first')
      const res = keys.map((v) => { const [m, k] = v.split(':'); return { m, k, ...s.bulk([...sel], m, k, bulk.ch, on) } })
      if (keys.length === 1) { const { m, k, hit, skip, other } = res[0]; return say(`${itemOf(m, k).n} turned ${word} for ${hit} ${MODULES[m].idp}.${skip ? ` ${skip} skipped, no contact for that channel.` : ''}${other ? ` ${other} not in ${MODULES[m].label}.` : ''}`) }
      const hit = Math.max(...res.map((x) => x.hit)), skip = Math.max(...res.map((x) => x.skip))
      return say(`${keys.length} events turned ${word} for up to ${hit} registrations.${skip ? ` Up to ${skip} skipped, no contact for that channel.` : ''}`)
    }
    if (!bulk.msg) return say('Choose a scheduled report first')
    const [m, k] = bulk.msg.split(':')
    const { hit, skip, other } = s.bulk([...sel], m, k, bulk.ch, on)
    say(`${itemOf(m, k).n} turned ${word} for ${hit} ${MODULES[m].idp}.${skip ? ` ${skip} skipped, no contact for that channel.` : ''}${other ? ` ${other} not in ${MODULES[m].label}.` : ''}`)
  }
  const doSend = async (item, ch) => {
    const { c, r, m } = found, ct = contactOf(c, r)
    try {
      await sendNow({ registrationId: r.id, key: item.k, channel: ch })
      if (ch === 'wa') addSingleLog({ client: c.name, module: m, regId: r.id, mobile: ct.mobile, event: item.n })
      say(`${item.n} sent to ${ct.name} (${ch === 'wa' ? ct.mobile : ct.email}).`)
    } catch (e) { say(`Could not send ${item.n}: ${e.message}`) }
  }

  const rows = []
  slice.forEach(({ c, regs }) => {
    const isOpen = open.has(c.id) || !!f.q.trim()
    let e = 0, et = 0, w = 0, wt = 0
    regs.forEach(({ m, r }) => { const k = countsFor(settings[r.id], m); e += k.e; et += k.et; w += k.w; wt += k.wt })
    const ids = regs.map((x) => x.r.id), ns = ids.filter((id) => sel.has(id)).length
    const per_m = {}; regs.forEach((x) => { per_m[x.m] = (per_m[x.m] || 0) + 1 })
    const used = [...new Map(regs.map(({ r }) => { const x = contactOf(c, r); return [x.id, x] })).values()]
    rows.push(
      <tr key={`c${c.id}`} className={`client ${isOpen ? 'open' : ''}`} onClick={() => toggle(setOpen, c.id)}>
        <td className="tsel"><Check checked={ns === ids.length} some={ns > 0} onChange={(on) => selectIds(ids, on)} label={`Select all of ${c.name}`} /></td>
        <td><span className="chev"><Icon name="chevron" size={14} /></span><span className="cname">{c.name}</span><div className="csub" style={{ marginLeft: 28 }}>PAN {c.pan}</div></td>
        <td>{!isOpen && MOD_KEYS.filter((m) => per_m[m]).map((m) => <ModuleTag key={m} module={m} label={`${MODULES[m].label}${per_m[m] > 1 ? ` (${per_m[m]})` : ''}`} />)}</td>
        <td className="cp">{isOpen ? <span className="muted">{used.length} {used.length === 1 ? 'contact' : 'contacts'}</span>
          : <div className="cpw"><AvatarStack contacts={used} /><span className="t">{used.length === 1 ? used[0].name : `${used.length} contacts`}</span></div>}</td>
        <td className="cn">{et ? <><b>{e}</b> of {et} on</> : <span className="muted">—</span>}</td><td className="cn">{wt ? <><b>{w}</b> of {wt} on</> : <span className="muted">—</span>}</td><td />
      </tr>)
    if (!isOpen) return
    let gstSeen = 0
    const gstTotal = regs.filter((x) => x.m === 'gst').length
    regs.forEach(({ m, r }) => {
      if (m === 'gst' && gstTotal > GST_SHOWN && !showAll.has(c.id)) {
        gstSeen++
        if (gstSeen > GST_SHOWN) { if (gstSeen === GST_SHOWN + 1) rows.push(<tr key={`m${c.id}`} className="more"><td /><td colSpan={6}><button className="link" onClick={() => toggle(setShowAll, c.id)}>Show all {gstTotal} GSTINs</button></td></tr>); return }
      }
      const ct = contactOf(c, r), k = countsFor(settings[r.id], m), miss = !ct.email || !ct.mobile
      rows.push(
        <tr key={r.id} className="reg" onClick={() => setPanel(r.id)}>
          <td className="tsel"><Check checked={sel.has(r.id)} onChange={(on) => selectIds([r.id], on)} label={`Select ${r.id}`} /></td>
          <td className="indent"><span className="rid">{r.id}</span><span className="rtag">{regTag(r)}</span></td>
          <td><ModuleTag module={m} label={MODULES[m].label} /></td>
          <td className="cp"><div className="cpw"><Avatar name={ct.name} /><span className="t">{ct.name}{miss && <small><span className="warn">{!ct.email ? 'no email' : 'no mobile'}</span></small>}</span></div></td>
          <td className="cn">{k.et ? <><b>{k.e}</b> of {k.et} on</> : <span className="muted">—</span>}</td><td className="cn">{k.wt ? <><b>{k.w}</b> of {k.wt} on</> : <span className="muted">—</span>}</td>
          <td><span className="open-btn" aria-hidden="true"><Icon name="chevron" size={14} /></span></td>
        </tr>)
    })
  })

    return (
    <main className="page">
      <div className="crumbs"><a href="#/">← Back to Client Master</a></div>
      <header className="top">
        <div>
          <h1><span className="titleicon"><Icon name="gear" size={20} /></span>Client Communications</h1>
          <p className="muted">Choose which reports and events each client hears about, on email and WhatsApp. One list for GST, TDS and ITR.</p>
        </div>
        <div className="topbtns"><a className="btn" href="#/configuration"><Icon name="plug" size={16} />Configuration</a></div>
      </header>

      <div className="controls setbar">
        <label className="searchbox"><Icon name="search" size={15} />
          <input className="search" type="search" placeholder="Search client, PAN, GSTIN, TAN or contact" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search by client, PAN, GSTIN, TAN or contact" /></label>
        <MultiFilterButton label="Module" icon="layers" value={f.module} options={[...MOD_KEYS.map((m) => ({ value: m, label: MODULES[m].label }))]} onChange={(module) => set({ module })} />
        <MultiFilterButton label="Registration type" icon="tag" value={f.type} options={typeOptions} onChange={(type) => set({ type })} />
        <MultiFilterButton label="Contact" icon="status" value={f.contact} options={[{ value: 'noemail', label: 'Missing email' }, { value: 'nomobile', label: 'Missing mobile' }]} onChange={(contact) => set({ contact })} />
        <span className="vsep" />
        <button className="btn ghost" onClick={() => setDefaultsOpen(true)}><Icon name="gear" size={16} />Defaults for new clients</button>
        <a className="btn ghost" href="#/whatsapp-logs"><ChannelIcon ch="wa" size={18} />WhatsApp Logs</a>
        <a className="btn ghost" href="#/email-logs"><ChannelIcon ch="email" size={16} />Email Logs</a>
      </div>

      <section className="panel" aria-label="Clients">
        {sel.size > 0 && (
          <div className="selbar"><b>{sel.size} selected</b><span className="muted">Turn</span>
            <select value={bulk.kind} onChange={(e) => setBulk({ ...bulk, kind: e.target.value, msg: '', msgs: [] })} aria-label="What to turn on or off">
              <option value="report">Scheduled report</option><option value="event">Event</option></select>
            {bulk.kind === 'report'
              ? <select value={bulk.msg} onChange={(e) => setBulk({ ...bulk, msg: e.target.value })} aria-label="Scheduled report">
                <option value="">Choose a scheduled report</option>
                {offered.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((i) => <option key={`${g.m}:${i.k}`} value={`${g.m}:${i.k}`}>{i.n}</option>)}</optgroup>)}
              </select>
              : <MultiPick noun="event" placeholder="Choose events" value={bulk.msgs} onChange={(msgs) => setBulk({ ...bulk, msgs })}
                groups={offered.map((g) => ({ label: g.label, items: g.items.map((i) => ({ value: `${g.m}:${i.k}`, label: i.n })) }))} />}
            <select value={bulk.ch} onChange={(e) => setBulk({ ...bulk, ch: e.target.value })} aria-label="Channel"><option value="both">Email and WhatsApp</option><option value="email">Email only</option><option value="wa">WhatsApp only</option></select>
            <button className="btn sm" onClick={() => doBulk(true)}>On</button><button className="btn line sm" onClick={() => doBulk(false)}>Off</button>
            <span style={{ flex: 1 }} /><button className="link" onClick={() => setSel(new Set())}>Clear selection</button></div>
        )}
        <div className="panel-scroll"><table className="clist">
          <thead><tr>
            <th className="tsel"><Check checked={pageIds.length > 0 && pageIds.every((id) => sel.has(id))} some={pageIds.some((id) => sel.has(id))} onChange={(on) => selectIds(pageIds, on)} label="Select everything on this page" /></th>
            <th style={{ width: '36%' }}>Client and registrations</th><th>Module</th><th>Contact</th>
            <th><ChannelIcon ch="email" size={14} /> Email</th><th><ChannelIcon ch="wa" size={14} /> WhatsApp</th><th style={{ width: 44 }} /></tr></thead>
          <tbody>{rows.length ? rows : <tr><td colSpan={7} className="emptycell"><b>No clients found</b><div className="muted">Try a different search or filter.</div></td></tr>}</tbody>
        </table></div>
      </section>
      <Pager page={pg} total={list.length} pageSize={per} sizes={PAGE_SIZES} noun="clients" info={`· ${nreg} registrations`} onPage={setPage} onSize={setPer} />

      {found && (
        <RegistrationPanel found={found} store={settings[panel]} onClose={() => setPanel(null)}
          onSwitch={(k, ch, v) => s.setSwitch(scopeReg, k, ch, v)} onGroup={(g, v) => s.setGroup(scopeReg, found.m, g, v)}
          onPick={(id) => s.pickContact(panel, id)} onSaveContact={(mode, form) => { s.saveContact(panel, mode, form); say(mode === 'edit' ? 'Contact saved.' : `Contact added and picked for this ${MODULES[found.m].idl}.`) }}
          onCopy={() => { const n = s.copyToOthers(panel); say(`Switches copied to ${n} other ${n === 1 ? MODULES[found.m].idl : MODULES[found.m].idp} of ${found.c.name}. Their contacts are unchanged.`) }}
          onSend={doSend} />
      )}
      {defaultsOpen && (
        <DefaultsPanel defaults={s.data.defaults} counts={counts} onClose={() => setDefaultsOpen(false)}
          onSwitch={(m, k, ch, v) => s.setSwitch({ module: m }, k, ch, v)} onGroup={(m, g, v) => s.setGroup({ module: m }, m, g, v)}
          onApply={(m) => { const n = s.applyDefaults(m); say(`Defaults applied to ${n} ${MODULES[m].idp}.`) }} />
      )}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
    </main>
  )
}
