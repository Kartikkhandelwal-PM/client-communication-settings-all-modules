import { useMemo, useState } from 'react'
import { Icon, MultiFilterButton, Pager } from './ui.jsx'
import { StatusBadge } from './WhatsAppLogs.jsx'
import { ModuleTag } from './Avatar.jsx'
import { MODULES } from '../api/data.js'
import { STATUSES, STATUS_ORDER, runMessages, fmt, fmtSec, toCsv, downloadCsv } from '../api/whatsappLogs.js'

const num = (n) => n.toLocaleString()

// One run: the summary numbers and the message sent to every targeted client
export default function RunDetail({ run, loading }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const all = useMemo(() => (run ? runMessages(run) : []), [run])
  const rows = useMemo(() => all.filter((m) => (!status.length || status.includes(m.status)) && (!q.trim() || (m.id + m.client + m.regId + m.mobile).toLowerCase().includes(q.trim().toLowerCase()))), [all, status, q])
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize)

  if (!run) return <main className="page"><div className="crumbs"><a href="#/whatsapp-logs">← Back to WhatsApp Logs</a></div><div className="empty">{loading ? <><div className="spinner" />Loading…</> : <><b>Run not found</b><span className="muted">It may be older than 60 days.</span></>}</div></main>

  const cards = [['Targeted', run.targeted, ''], ['Sent', run.sent, 'amber'], ['Delivered', run.delivered, 'green'], ['Read', run.read, 'blue'], ['Failed', run.failed, 'red']]
  const exportCsv = () => downloadCsv(toCsv([['ID', (m) => m.id], ['Client', (m) => m.client], [MODULES[run.module].idl, (m) => m.regId], ['Mobile', (m) => m.mobile], ['Status', (m) => STATUSES[m.status].label], ['Sent at', (m) => fmtSec(m.sentAt)], ['Delivered at', (m) => fmtSec(m.deliveredAt)], ['Read at', (m) => fmtSec(m.readAt)], ['Reason', (m) => m.reason]].map(([label, value]) => ({ label, value })), rows), `${run.id}.csv`)

  return (
    <main className="page">
      <div className="crumbs"><a href="#/whatsapp-logs">← Back to WhatsApp Logs</a></div>
      <header className="top">
        <div>
          <h1>{run.id}<span className="runname">{run.event}</span><span style={{ marginLeft: 12 }}><ModuleTag module={run.module} label={MODULES[run.module].label} /></span></h1>
          <p className="muted">{fmt(run.at)} · {num(run.targeted)} clients targeted</p>
        </div>
        <div className="topbtns"><button className="btn" onClick={exportCsv}><Icon name="download" size={16} />Export</button></div>
      </header>

      <div className="statrow">
        {cards.map(([l, n, tone]) => (
          <div key={l} className="statcell"><span className="sl">{l}</span><span className={`sn ${tone ? `c-${tone}` : ''} ${n ? '' : 'zero'}`}>{num(n)}</span>
            {l !== 'Targeted' && <span className="ss">{run.targeted ? Math.round((n / run.targeted) * 100) : 0}% of targeted</span>}</div>
        ))}
      </div>

      <div className="controls">
        <label className="searchbox"><Icon name="search" size={15} />
          <input className="search" type="search" placeholder={`Search client, ${MODULES[run.module].idl} or mobile`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} aria-label="Search messages" /></label>
        <MultiFilterButton label="Status" icon="status" value={status} options={[...STATUS_ORDER.map((s) => ({ value: s, label: STATUSES[s].label, count: all.filter((m) => m.status === s).length }))]} onChange={(s) => { setStatus(s); setPage(0) }} />
      </div>

      <section className="panel" aria-label="Messages in this run">
        <div className="panel-scroll">
          {rows.length > 0 && (
            <table className="logs flat" style={{ minWidth: 1320 }}>
              <colgroup><col style={{ width: 130 }} /><col style={{ width: 280 }} /><col style={{ width: 140 }} /><col style={{ width: 120 }} /><col style={{ width: 170 }} /><col style={{ width: 170 }} /><col style={{ width: 170 }} /><col style={{ width: 240 }} /></colgroup>
              <thead><tr><th>ID</th><th>Client</th><th>Mobile no.</th><th>Status</th><th>Sent at</th><th>Delivered at</th><th>Read at</th><th>Reason</th></tr></thead>
              <tbody>
                {slice.map((m) => (
                  <tr key={m.id}>
                    <td className="idcell">{m.id}</td><td><span className="title" title={m.client}>{m.client}</span><div className="sub">{m.regId}</div></td>
                    <td className="muted-cell">{m.mobile}</td><td><StatusBadge status={m.status} /></td>
                    <td className="muted-cell">{fmtSec(m.sentAt)}</td><td className="muted-cell">{fmtSec(m.deliveredAt)}</td><td className="muted-cell">{fmtSec(m.readAt)}</td>
                    <td className="muted-cell"><span className="trunc" title={m.reason}>{m.reason || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {rows.length === 0 && <div className="empty"><b>No messages match</b><span className="muted">Try a different search or status.</span></div>}
      </section>
      <Pager page={page} total={rows.length} pageSize={pageSize} sizes={[25, 50, 100, 200]} noun="messages" onPage={setPage} onSize={(n) => { setPageSize(n); setPage(0) }} />
    </main>
  )
}
