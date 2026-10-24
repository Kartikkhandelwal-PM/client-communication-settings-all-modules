import { useEffect, useState } from 'react'
import { CATALOG, MODULES, MOD_KEYS } from '../api/data.js'
import { Icon } from './ui.jsx'
import MessageList, { MessageHead } from './MessageList.jsx'

// Defaults for new clients: what is on for every new GSTIN / TAN / PAN, per module.
export default function DefaultsPanel({ defaults, counts, onClose, onSwitch, onGroup, onApply }) {
  const [m, setM] = useState('gst')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { const esc = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc) }, [onClose])
  const M = MODULES[m], n = counts[m]
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Defaults for new clients">
        <div className="dh"><div><h2 style={{ margin: 0 }}>Defaults for new clients</h2>
          <div className="muted small" style={{ marginTop: 2 }}>Every new GSTIN, TAN or PAN added from Client Master gets these settings automatically.</div></div>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="db">
          <div className="sec"><div className="seg2" role="group" aria-label="Module">
            {MOD_KEYS.map((k) => <button key={k} aria-pressed={m === k} onClick={() => { setM(k); setConfirm(false); setQ('') }}>{MODULES[k].label}</button>)}</div></div>
          {CATALOG[m].length > 0 && <div className="dsearch" style={{ marginTop: 6 }}><Icon name="search" size={14} /><input type="search" placeholder="Search reports and events" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" /></div>}
          {CATALOG[m].length > 0 && <MessageHead />}
          <MessageList module={m} store={defaults[m]} query={q} onSwitch={(k, ch, v) => onSwitch(m, k, ch, v)} onGroup={(g, v) => onGroup(m, g, v)} />
        </div>
        {confirm && (
          <div className="confirm"><b>This changes all {n} existing {M.idp}.</b> Their current {M.label} settings are replaced by the defaults above.<br />
            <button className="btn sm" onClick={() => { setConfirm(false); onApply(m) }}>Yes, apply to all {n}</button>
            <button className="btn line sm" onClick={() => setConfirm(false)}>Cancel</button></div>
        )}
        <div className="df"><span className="muted small" style={{ flex: 1 }}>Existing clients stay as they are unless you apply.</span>
          <button className="btn line sm" onClick={() => setConfirm(true)}>Apply to all existing {M.idp}</button></div>
      </aside>
    </>
  )
}
