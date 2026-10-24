import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Icon, FilterButton, Pager, ChannelIcon } from './ui.jsx'
import RunDetail from './RunDetail.jsx'
import { MODULES } from '../api/data.js'
import { ModuleTag } from './Avatar.jsx'
import { LOG_MODS, STATUSES, STATUS_ORDER, RETENTION_DAYS, BULK_EVENTS, SCHEDULED, SINGLE_EVENTS, getUpcoming, subscribeUpcoming, nextRunAt, fetchRuns, fetchSingles, fmt, toCsv, downloadCsv } from '../api/whatsappLogs.js'

const PAGE_SIZES = [25, 50, 100]
const num = (n) => n.toLocaleString()

export const StatusBadge = ({ status }) => {
  const s = STATUSES[status]
  return <span className={`badge badge-${s.tone}`} title={s.help}>{s.label}</span>
}
const Count = ({ n, tone }) => (n ? <span className={tone ? `c-${tone}` : ''}>{num(n)}</span> : <span className="muted">0</span>)

// Page: list of runs (one per message type per day) and the single "send now" messages
export default function WhatsAppLogs({ runId }) {
  const [tab, setTab] = useState('runs')
  const [runs, setRuns] = useState([])
  const [singles, setSingles] = useState([])
  const [f, setF] = useState({ q: '', days: String(RETENTION_DAYS), module: 'all', event: 'all', status: 'all' })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const upcoming = useSyncExternalStore(subscribeUpcoming, getUpcoming)

  useEffect(() => { fetchRuns().then(setRuns); fetchSingles().then(setSingles) }, [runId])
  useEffect(() => setPage(0), [f, tab, pageSize])
  // events offered in the filter: the ones of the chosen module (or all)
  const eventOptions = (tab === 'runs' ? BULK_EVENTS.map((e) => ({ label: e.label, module: e.module })) : SINGLE_EVENTS).filter((e) => f.module === 'all' || e.module === f.module)

  const midnight = new Date().setHours(0, 0, 0, 0)
  const since = f.days === '1' ? midnight : Date.now() - f.days * 86400e3
  const runRows = useMemo(() => runs.filter((r) =>
    r.at >= since && (f.module === 'all' || r.module === f.module) && (f.event === 'all' || r.event === f.event) &&
    (!f.q.trim() || (r.id + r.event).toLowerCase().includes(f.q.trim().toLowerCase()))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [runs, f])
  const singleRows = useMemo(() => singles.filter((s) =>
    s.sentAt >= since && (f.module === 'all' || s.module === f.module) && (f.status === 'all' || s.status === f.status) && (f.event === 'all' || s.event === f.event) &&
    (!f.q.trim() || (s.id + s.client + s.regId + s.mobile + s.event).toLowerCase().includes(f.q.trim().toLowerCase()))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [singles, f])

  if (runId) return <RunDetail run={runs.find((r) => r.id === runId)} loading={!runs.length} />

  const rows = tab === 'runs' ? runRows : singleRows
  // the next scheduled GSTR-2A / 2B report is shown at the top of the first page, unless a search or filter rules it out
  const showUpcoming = tab === 'runs' && (f.module === 'all' || f.module === 'gst') && (f.event === 'all' || f.event === SCHEDULED.label) && (!f.q.trim() || 'upcoming 2b report'.includes(f.q.trim().toLowerCase()))
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize)

  const exportCsv = () => {
    const cols = tab === 'runs'
      ? [['ID', (r) => r.id], ['Module', (r) => MODULES[r.module].label], ['Trigger event', (r) => r.event], ['Run at', (r) => fmt(r.at)], ['Targeted', (r) => r.targeted], ['Sent', (r) => r.sent], ['Delivered', (r) => r.delivered], ['Read', (r) => r.read], ['Failed', (r) => r.failed]]
      : [['ID', (r) => r.id], ['Module', (r) => MODULES[r.module].label], ['Client', (r) => r.client], ['GSTIN / TAN / PAN', (r) => r.regId], ['Mobile', (r) => r.mobile], ['Trigger event', (r) => r.event], ['Sent by', (r) => r.by], ['Sent at', (r) => fmt(r.sentAt)], ['Status', (r) => STATUSES[r.status].label], ['Reason', (r) => r.reason]]
    downloadCsv(toCsv(cols.map(([label, value]) => ({ label, value })), rows), `whatsapp-${tab}.csv`)
  }

  return (
    <main className="page">
      <div className="crumbs"><a href="#/">← Back to Client Communication Settings</a></div>
      <header className="top">
        <div>
          <h1><span className="titleicon"><ChannelIcon ch="wa" size={22} /></span>WhatsApp Logs</h1>
          <p className="muted">WhatsApp messages sent to your clients from {LOG_MODS.map((k) => MODULES[k].label).join(', ').replace(/, ([^,]*)$/, ' and $1')}, and their status. Kept for {RETENTION_DAYS} days.</p>
        </div>
        <div className="topbtns"><button className="btn" onClick={exportCsv}><Icon name="download" size={16} />Export</button></div>
      </header>

      <div className="controls">
        <div className="tabs" role="tablist" aria-label="Log type">
          <button role="tab" aria-selected={tab === 'runs'} className={tab === 'runs' ? 'on' : ''} onClick={() => setTab('runs')}><Icon name="layers" size={15} />Bulk messages</button>
          <button role="tab" aria-selected={tab === 'single'} className={tab === 'single' ? 'on' : ''} onClick={() => setTab('single')}><Icon name="send" size={15} />Single messages</button>
        </div>
        <label className="searchbox">
          <Icon name="search" size={15} />
          <input className="search" type="search" placeholder={tab === 'runs' ? 'Search run ID or trigger event' : 'Search ID, client, GSTIN, TAN or PAN'} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search logs" />
        </label>
        <FilterButton label="Module" icon="layers" value={f.module} options={[{ value: 'all', label: 'All modules' }, ...LOG_MODS.map((k) => ({ value: k, label: MODULES[k].label }))]} onChange={(module) => setF({ ...f, module, event: 'all' })} />
        <FilterButton label="Trigger event" icon="tag" value={f.event} options={[{ value: 'all', label: 'All trigger events' }, ...eventOptions.map((e) => ({ value: e.label, label: e.label }))]} onChange={(event) => setF({ ...f, event })} />
        {tab === 'single' && <FilterButton label="Status" icon="status" value={f.status} options={[{ value: 'all', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUSES[s].label }))]} onChange={(status) => setF({ ...f, status })} />}
        <FilterButton label="Date" alwaysValue icon="calendar" value={f.days} options={[{ value: '60', label: 'Last 60 days' }, { value: '30', label: 'Last 30 days' }, { value: '7', label: 'Last 7 days' }, { value: '1', label: 'Today' }]} onChange={(days) => setF({ ...f, days })} />
      </div>

      <section className="panel" aria-label="WhatsApp logs">
        <div className="panel-scroll">
          {rows.length > 0 && tab === 'runs' && (
            <table className="logs flat" style={{ minWidth: 1260 }}>
              <colgroup><col style={{ width: 100 }} /><col style={{ width: 90 }} /><col style={{ width: 260 }} /><col style={{ width: 190 }} />{Array.from({ length: 5 }, (_, i) => <col key={i} style={{ width: 100 }} />)}<col style={{ width: 110 }} /></colgroup>
              <thead><tr><th>ID</th><th>Module</th><th>Trigger event</th><th>Run at</th>
                <th className="r" title="Clients selected for this run (their switch was on)">Targeted</th>
                <th className="r" title="Handed over to WhatsApp, not yet on the client's phone">Sent</th><th className="r">Delivered</th><th className="r">Read</th><th className="r">Failed</th><th className="r" title="Delivered or read, out of targeted">Reached</th></tr></thead>
              <tbody>
                {page === 0 && showUpcoming && (
                  <tr className="upcoming">
                    <td><span className="badge badge-blue">Upcoming</span></td>
                    <td><ModuleTag module="gst" label="GST" /></td>
                    <td><span className="title">{SCHEDULED.label}</span></td>
                    <td className="muted-cell">{fmt(nextRunAt())}</td>
                    <td className="r num" title="Registrations whose GSTR-2A / 2B report WhatsApp switch is on right now. The final number is fixed when the run starts."><b>{upcoming.targeted == null ? '…' : num(upcoming.targeted)}</b></td>
                    {Array.from({ length: 5 }, (_, i) => <td key={i} className="r num muted">—</td>)}
                  </tr>
                )}
                {slice.map((r) => (
                  <tr key={r.id} className="click" onClick={() => { window.location.hash = `#/whatsapp-logs/${r.id}` }}>
                    <td className="idcell">{r.id}</td>
                    <td><ModuleTag module={r.module} label={MODULES[r.module].label} /></td>
                    <td><span className="title" title={r.event}>{r.event}</span></td>
                    <td className="muted-cell">{fmt(r.at)}</td>
                    <td className="r num"><b>{num(r.targeted)}</b></td>
                    <td className="r num"><Count n={r.sent} tone="amber" /></td>
                    <td className="r num"><Count n={r.delivered} tone="green" /></td><td className="r num"><Count n={r.read} tone="blue" /></td>
                    <td className="r num"><Count n={r.failed} tone="red" /></td>
                    <td className="r num">{r.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length > 0 && tab === 'single' && (
            <table className="logs flat" style={{ minWidth: 1700 }}>
              <colgroup><col style={{ width: 100 }} /><col style={{ width: 90 }} /><col style={{ width: 280 }} /><col style={{ width: 140 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 190 }} /><col style={{ width: 190 }} /><col style={{ width: 120 }} /><col style={{ width: 240 }} /></colgroup>
              <thead><tr><th>ID</th><th>Module</th><th>Client</th><th>Mobile no.</th><th>Trigger event</th><th>Sent by</th><th>Sent at</th><th>Delivered at</th><th>Status</th><th>Reason</th></tr></thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id}>
                    <td className="idcell">{s.id}</td>
                    <td><ModuleTag module={s.module} label={MODULES[s.module].label} /></td>
                    <td><span className="title" title={s.client}>{s.client}</span><div className="sub">{s.regId}</div></td>
                    <td className="muted-cell">{s.mobile}</td><td className="muted-cell"><span className="trunc" title={s.event}>{s.event}</span></td><td className="muted-cell">{s.by}</td>
                    <td className="muted-cell">{fmt(s.sentAt)}</td><td className="muted-cell">{fmt(s.deliveredAt)}</td>
                    <td><StatusBadge status={s.status} /></td><td className="muted-cell"><span className="trunc" title={s.reason}>{s.reason || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {rows.length === 0 && <div className="empty"><b>No logs found</b><span className="muted">{tab === 'single' ? 'Messages sent to one client with the Send button on the settings page show up here.' : 'Try a different search, message or date range.'}</span></div>}
      </section>
      <Pager page={page} total={rows.length} pageSize={pageSize} sizes={PAGE_SIZES} noun={tab === 'runs' ? 'runs' : 'messages'} onPage={setPage} onSize={setPageSize} />
    </main>
  )
}
