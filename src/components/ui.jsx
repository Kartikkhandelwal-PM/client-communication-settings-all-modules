import { useEffect, useRef, useState } from 'react'

// Small line icons on a 16px grid (same set style as Email Logs)
const ICONS = {
  mail: <><rect x="2" y="3.5" width="12" height="9" rx="1.8" /><path d="M2.6 4.7 8 8.7l5.4-4" /></>,
  check: <path d="M3.5 8.4 6.6 11.5 12.5 4.8" />,
  download: <path d="M8 2.5v7.5M4.8 7.2 8 10.4l3.2-3.2M2.8 13h10.4" />,
  send: <path d="M14 2 7 9M14 2l-4.5 12L7 9 2 6.5z" />,
  edit: <path d="M10.8 3.2 12.8 5.2M2.8 13.2l.6-2.6 7.4-7.4 2 2-7.4 7.4z" />,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.8" /><path d="M2.5 6.8h11M5.5 2v3M10.5 2v3" /></>,
  bell: <><path d="M4 11V7.2a4 4 0 0 1 8 0V11l1.2 1.4H2.8z" /><path d="M6.6 14a1.5 1.5 0 0 0 2.8 0" /></>,
  search: <><circle cx="7" cy="7" r="4.2" /><path d="M10.3 10.3 13.6 13.6" /></>,
  chevron: <path d="M3.8 6.2 8 10.2l4.2-4" />,
  tag: <><path d="M2.5 8.3V3.5a1 1 0 0 1 1-1h4.8l5.2 5.2a1 1 0 0 1 0 1.4l-4.4 4.4a1 1 0 0 1-1.4 0z" /><circle cx="5.6" cy="5.6" r="1" /></>,
  status: <><circle cx="8" cy="8" r="5.6" /><path d="M5.6 8.2l1.7 1.7 3.2-3.4" /></>,
  layers: <><path d="M8 2.5 14 5.7 8 8.9 2 5.7z" /><path d="M2 9l6 3.2L14 9" /></>,
  gear: <><circle cx="8" cy="8" r="2" /><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1" /></>,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  up: <path d="M3.8 9.8 8 5.8l4.2 4" />,
  down: <path d="M3.8 6.2 8 10.2l4.2-4" />,
  sparkle: <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.6 1.6M10.4 10.4 12 12M12 4l-1.6 1.6M5.6 10.4 4 12" />,
  whatsapp: <path d="M8 2a6 6 0 0 0-5.2 9L2 14l3.1-.8A6 6 0 1 0 8 2z" />,
}
export const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ico">
    {ICONS[name]}
  </svg>
)

// Channel icons: Gmail "M" for email (Simple Icons glyph), WhatsApp app logo for WhatsApp
const PHONE = "M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"
export function ChannelIcon({ ch, size = 20 }) {
  if (ch === 'wa') {
    return (
      <svg width={size} height={size} viewBox="3.6 3.6 32.8 32.8" role="img" aria-label="WhatsApp" className="chicon">
        <defs>
          <linearGradient id="wa-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5CD864" /><stop offset="1" stopColor="#25B03B" /></linearGradient>
        </defs>
        <path d="M20 4.2a15.6 15.6 0 0 0-13.4 23.6l-1.9 6.5 6.7-1.8A15.6 15.6 0 1 0 20 4.2z" fill="url(#wa-g)" />
        <g transform="translate(11.6 11.4) scale(.0335)" fill="#fff"><path d={PHONE} /></g>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Email" className="chicon">
      <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  )
}

// Toggle. `mixed` shows a half-on state (used in column headers when only some rows are on).
export function Switch({ checked, mixed, disabled, wa, onChange, label, title }) {
  return (
    <label className={`sw ${wa ? 'wa' : ''} ${mixed ? 'mixed' : ''}`} title={title} onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  )
}

// Fixed-position popover so a scrolling table cannot clip it.
// button({ onClick, open }) draws the trigger; children(close) draws the content.
export function Popover({ button, children, width = 240, align = 'left', onOpen }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (!pos) return
    const out = (e) => { if (!ref.current?.contains(e.target)) setPos(null) }
    const esc = (e) => e.key === 'Escape' && setPos(null)
    const close = () => setPos(null)
    const onScroll = (e) => { if (!ref.current?.contains(e.target)) setPos(null) }
    document.addEventListener('mousedown', out)
    window.addEventListener('keydown', esc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', out); window.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', close)
    }
  }, [pos])
  const toggle = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = e.currentTarget.getBoundingClientRect()
    onOpen?.()
    const raw = align === 'right' ? r.right - width : r.left
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(raw, window.innerWidth - width - 12)) })
  }
  return (
    <span ref={ref} className="popwrap">
      {button({ onClick: toggle, open: !!pos })}
      {pos && <div className="pop" style={{ top: pos.top, left: pos.left, width }} onClick={(e) => e.stopPropagation()}>{children(() => setPos(null))}</div>}
    </span>
  )
}

// The list inside a filter dropdown. With more than 7 choices it gets a search box on top.
const SEARCH_FROM = 8
function OptionList({ options, value, onChange, close }) {
  const [q, setQ] = useState('')
  const searchable = options.length >= SEARCH_FROM
  const needle = q.trim().toLowerCase()
  // the first choice ("All ...") always stays in the list
  const shown = options.filter((o, i) => i === 0 || !needle || o.label.toLowerCase().includes(needle))
  return (
    <div className="pop-list">
      {searchable && (
        <div className="pop-search">
          <Icon name="search" size={14} />
          <input autoFocus type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search choices" />
        </div>
      )}
      {shown.map((o) => (
        <button key={o.value} className={o.value === value ? 'sel' : ''} onClick={() => { onChange(o.value); close() }}>
          <span>{o.label}</span>{o.count != null && <span className="muted small">{o.count}</span>}
        </button>
      ))}
      {searchable && needle && shown.length === 1 && <div className="pop-empty">No match</div>}
    </div>
  )
}

// One-choice dropdown button for the toolbar. Every filter reads the same way:
// "Status" when nothing is picked, "Status: Read" when something is. A filter that always has a value
// (the date range) passes alwaysValue and reads "Date: Last 60 days".
export function FilterButton({ label, icon, value, options, onChange, alwaysValue }) {
  const picked = options.find((o) => o.value === value)
  const active = value !== options[0].value
  return (
    <Popover width={250} button={({ onClick, open }) => (
      <button className={`fbtn2 ${active ? 'on' : ''}`} onClick={onClick} aria-expanded={open}>
        {icon && <Icon name={icon} />}<span className="ftxt">{active || alwaysValue ? `${label}: ${picked.label}` : label}</span><span className="chev"><Icon name="chevron" size={14} /></span>
      </button>
    )}>
      {(close) => <OptionList options={options} value={value} onChange={onChange} close={close} />}
    </Popover>
  )
}

// A filter where several choices can be ticked. value = array of ticked values; nothing ticked means no filter.
export function MultiFilterButton({ label, icon, value, options, onChange }) {
  const picked = options.filter((o) => value.includes(o.value))
  const text = picked.length === 0 ? label : picked.length === 1 ? `${label}: ${picked[0].label}` : `${label}: ${picked.length} selected`
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = options.filter((o) => !needle || o.label.toLowerCase().includes(needle))
  const toggleOne = (v, on) => onChange(on ? [...value, v] : value.filter((x) => x !== v))
  return (
    <Popover width={250} onOpen={() => setQ('')} button={({ onClick, open }) => (
      <button className={`fbtn2 ${picked.length ? 'on' : ''}`} onClick={onClick} aria-expanded={open}>
        {icon && <Icon name={icon} />}<span className="ftxt" title={text}>{text}</span><span className="chev"><Icon name="chevron" size={14} /></span>
      </button>
    )}>
      {() => (
        <div className="pop-list mp">
          {options.length >= SEARCH_FROM && <div className="pop-search"><Icon name="search" size={14} /><input autoFocus type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search choices" /></div>}
          {shown.map((o) => (
            <label key={o.value} className="mp-row"><input type="checkbox" checked={value.includes(o.value)} onChange={(e) => toggleOne(o.value, e.target.checked)} /><span style={{ flex: 1 }}>{o.label}</span>{o.count != null && <span className="muted small">{o.count}</span>}</label>
          ))}
          {!shown.length && <div className="muted" style={{ padding: 12 }}>Nothing found.</div>}
          {value.length > 0 && <button className="link mp-clear" onClick={() => onChange([])}>Clear</button>}
        </div>
      )}
    </Popover>
  )
}

export function Pager({ page, total, pageSize, onPage, onSize, sizes, noun = 'clients', info }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <nav className="pager">
      <span className="muted small">{(page * pageSize + 1).toLocaleString()}–{Math.min(total, (page + 1) * pageSize).toLocaleString()} of {total.toLocaleString()} {noun}{info && <span className="muted"> {info}</span>}</span>
      <select value={pageSize} onChange={(e) => onSize(+e.target.value)} aria-label="Rows per page">
        {sizes.map((n) => <option key={n} value={n}>{n} per page</option>)}
      </select>
      <button className="btn ghost" disabled={page === 0} onClick={() => onPage(0)} aria-label="First page">«</button>
      <button className="btn ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="small">Page {page + 1} of {pages.toLocaleString()}</span>
      <button className="btn ghost" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      <button className="btn ghost" disabled={page + 1 >= pages} onClick={() => onPage(pages - 1)} aria-label="Last page">»</button>
    </nav>
  )
}

export function useToast() {
  const [msg, setMsg] = useState('')
  const t = useRef()
  const show = (m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2800) }
  return [msg, show]
}
