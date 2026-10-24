import { useState } from 'react'
import { Icon, Popover } from './ui.jsx'

// A dropdown where several items can be ticked. groups = [{ label, items: [{ value, label }] }], value = array of ticked values.
export default function MultiPick({ placeholder, noun, groups, value, onChange }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => !needle || i.label.toLowerCase().includes(needle) || g.label.toLowerCase().includes(needle)) })).filter((g) => g.items.length)
  const set = (vals, on) => onChange(on ? [...new Set([...value, ...vals])] : value.filter((v) => !vals.includes(v)))
  return (
    <Popover width={320} onOpen={() => setQ('')} button={({ onClick, open }) => (
      <button type="button" className={`mpbtn ${value.length ? 'on' : ''}`} onClick={onClick} aria-expanded={open}>
        <span>{value.length ? `${value.length} ${value.length === 1 ? noun : `${noun}s`} selected` : placeholder}</span><span className="chev"><Icon name="chevron" size={14} /></span>
      </button>
    )}>
      {() => (
        <div className="pop-list mp">
          <div className="pop-search"><Icon name="search" size={14} /><input autoFocus type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${noun}s`} /></div>
          {shown.map((g) => {
            const vals = g.items.map((i) => i.value), all = vals.every((v) => value.includes(v))
            return (
              <div key={g.label}>
                <div className="mp-gh"><b>{g.label}</b><button type="button" className="link" onClick={() => set(vals, !all)}>{all ? 'Clear' : 'Select all'}</button></div>
                {g.items.map((i) => (
                  <label key={i.value} className="mp-row"><input type="checkbox" checked={value.includes(i.value)} onChange={(e) => set([i.value], e.target.checked)} />{i.label}</label>
                ))}
              </div>
            )
          })}
          {!shown.length && <div className="muted" style={{ padding: 12 }}>No {noun} found.</div>}
        </div>
      )}
    </Popover>
  )
}
