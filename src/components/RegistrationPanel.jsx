import { useEffect, useMemo, useState } from 'react'
import { CATALOG, MODULES, contactOf, regTag } from '../api/data.js'
import { Icon } from './ui.jsx'
import { Avatar, ModuleTag } from './Avatar.jsx'
import MessageList, { MessageHead } from './MessageList.jsx'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const tenDigits = (v) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')

// Contact for one registration: a card with who gets the messages, a way to change it, edit it, or add one.
function ContactBlock({ client, reg, module, used, onPick, onSave }) {
  const M = MODULES[module], ct = contactOf(client, reg), main = client.contacts[0]
  const [mode, setMode] = useState(null) // null | 'pick' | 'edit' | 'add'
  const [form, setForm] = useState(null)
  useEffect(() => { setMode(null); setForm(null) }, [reg.id])
  const openForm = (m) => { setMode(m); setForm(m === 'edit' ? { name: ct.name, email: ct.email, mobile: ct.mobile } : { name: '', email: '', mobile: '' }) }
  const choose = (id) => { onPick(id === main.id ? null : id); setMode(null) }
  const save = () => {
    const mob = tenDigits(form.mobile)
    let err = ''
    if (!form.name.trim()) err = 'n'
    else if (form.email.trim() && !EMAIL.test(form.email.trim())) err = 'e'
    else if (mob && !/^[6-9]\d{9}$/.test(mob)) err = 'm'
    if (err) return setForm({ ...form, err })
    onSave(mode, { name: form.name.trim(), email: form.email.trim(), mobile: mob ? `${mob.slice(0, 5)} ${mob.slice(5)}` : '' })
    setMode(null)
  }
  const field = (key, label, ph) => (
    <label>{label}<input className={form.err === key[0] ? 'bad' : ''} value={form[key]} placeholder={ph} onChange={(e) => setForm({ ...form, [key]: e.target.value, err: '' })} /></label>
  )
  return (
    <div className="sec">
      <h3>Contact for this {M.idl}</h3>
      <div className="ccard">
        <Avatar name={ct.name} size={40} />
        <div className="cinfo">
          <div><b>{ct.name}</b>{ct.id === main.id && <span className="badge badge-gray" style={{ marginLeft: 8 }}>Main contact</span>}</div>
          <div className="small">{ct.email ? <span className="muted">{ct.email}</span> : <span className="warn">No email</span>}</div>
          <div className="small">{ct.mobile ? <span className="muted">{ct.mobile}</span> : <span className="warn">No mobile number</span>}</div>
        </div>
        <div className="cacts">
          <button className="btn line sm" onClick={() => setMode(mode === 'pick' ? null : 'pick')} aria-expanded={mode === 'pick'}>Change</button>
          <button className="btn line sm" onClick={() => openForm('edit')}>Edit</button>
        </div>
      </div>

      {mode === 'pick' && (
        <div className="cpick" role="listbox" aria-label="Contacts of this client">
          {client.contacts.map((x) => (
            <button key={x.id} role="option" aria-selected={x.id === ct.id} className={x.id === ct.id ? 'on' : ''} onClick={() => choose(x.id)}>
              <Avatar name={x.name} size={32} />
              <span className="t"><b>{x.name}</b>{x.id === main.id && <span className="badge badge-gray" style={{ marginLeft: 8 }}>Main contact</span>}
                <small>{x.email || 'no email'} · {x.mobile || 'no mobile number'}</small></span>
              {x.id === ct.id && <Icon name="check" size={16} />}
            </button>
          ))}
          <button className="addc" onClick={() => openForm('add')}>+ Add a contact</button>
        </div>
      )}

      {(mode === 'edit' || mode === 'add') && form && (
        <div className="cform">
          <b>{mode === 'add' ? 'Add a contact' : `Edit ${ct.name}`}</b><div style={{ height: 8 }} />
          {field('name', 'Name')}{field('email', 'Email', 'name@company.com')}{field('mobile', 'Mobile number', '10 digits')}
          {form.err && <div className="err">{form.err === 'n' ? 'Enter a name.' : form.err === 'e' ? 'Enter a valid email, for example name@company.com.' : 'Enter a 10-digit mobile number.'}</div>}
          {mode === 'edit' && <div className="muted small" style={{ marginBottom: 8 }}>This changes the contact everywhere it is used ({used} {used === 1 ? 'registration' : 'registrations'}).</div>}
          {mode === 'add' && <div className="muted small" style={{ marginBottom: 8 }}>The new contact is used for this {M.idl}.</div>}
          <div className="btns"><button className="btn sm" onClick={save}>Save</button><button className="btn line sm" onClick={() => setMode(null)}>Cancel</button></div>
        </div>
      )}
      {(!ct.email || !ct.mobile) && (
        <div className="note warnbox">{ct.name} has no {!ct.email ? 'email' : 'mobile number'}, so {!ct.email ? 'email' : 'WhatsApp'} messages cannot be turned on for this {M.idl}.</div>
      )}
    </div>
  )
}

// Side panel for one GSTIN / TAN / PAN: contact, then every report and event.
export default function RegistrationPanel({ found, store, onClose, onSwitch, onGroup, onPick, onSaveContact, onCopy, onSend }) {
  const { c, r, m } = found, M = MODULES[m], ct = contactOf(c, r)
  const [q, setQ] = useState('')
  useEffect(() => { const esc = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc) }, [onClose])
  const used = useMemo(() => Object.values(c.regs).flat().filter((x) => contactOf(c, x).id === ct.id).length, [c, ct.id])
  const others = c.regs[m].length - 1
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Settings for ${r.id}`}>
        <div className="dh"><div><ModuleTag module={m} label={M.label} /> <span className="muted small">{c.name}</span>
          <h2><span className="rid">{r.id}</span><span className="rtag">{regTag(r)}</span></h2></div>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="db">
          <ContactBlock client={c} reg={r} module={m} used={used} onPick={onPick} onSave={onSaveContact} />
          {CATALOG[m].length > 0 && <div className="dsearch"><Icon name="search" size={14} /><input type="search" placeholder="Search reports and events" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" /></div>}
          {CATALOG[m].length > 0 && <MessageHead />}
          <MessageList module={m} store={store} query={q} disabled={{ email: !ct.email, wa: !ct.mobile }} onSwitch={onSwitch} onGroup={onGroup} onSend={onSend} />
          {CATALOG[m].some((g) => g.rep) && <p className="note">The small icon next to a scheduled report sends it to this contact right now.</p>}
        </div>
        <div className="df"><span className="muted small" style={{ flex: 1 }}>Changes save as you make them.</span>
          {others > 0 && <button className="btn line sm" onClick={onCopy} title={`Copy these switches to the other ${others} ${others === 1 ? M.idl : M.idp} of ${c.name} only. No other client changes, and the contacts stay as they are.`}>Copy to client’s other {M.idp}</button>}
          <button className="btn sm" onClick={onClose}>Done</button></div>
      </aside>
    </>
  )
}
