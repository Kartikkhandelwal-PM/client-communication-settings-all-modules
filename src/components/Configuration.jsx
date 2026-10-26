import { useEffect, useRef, useState } from 'react'
import { Icon, ChannelIcon, useToast } from './ui.jsx'

// Where the firm connects Email and WhatsApp. One page for the whole firm.
// Each channel sends from KDK's shared account, or from the firm's own (WhatsApp via Rampwin, email via its own domain).
// Demo only: nothing is saved or checked for real. The first domain check fails and the second succeeds, to show both states.

const PERSONAL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'rediffmail.com', 'aol.com', 'protonmail.com']
// The default sender is set per module: each module has its own default address. Only GST sends email today; TDS and ITR are shown greyed out until they go live.
const KDK = { waName: 'CA Connect', waNumber: '+91 98765 00000' }
// The system default WhatsApp numbers. There can be more than one later; each is listed as its own row.
const WA_DEFAULT = [
  { name: KDK.waName, number: KDK.waNumber },
]
const DEFAULT_FROM = [
  { mod: 'GST', email: 'noreply@expressgst.com', live: true },
  { mod: 'TDS', email: 'noreply@expressTDS.com', live: false },
  { mod: 'ITR', email: 'noreply@expressITR.com', live: false },
]
const LIVE_FROM = DEFAULT_FROM.filter((r) => r.live)

const Field = ({ label, hint, children }) => (
  <div className="cfield"><label>{label}</label>{hint && <p className="muted small">{hint}</p>}{children}</div>
)
// A value the user cannot change: an input box, greyed out, read-only, with a small lock.
const Locked = ({ value, label }) => (
  <div className="clocked">
    <input readOnly tabIndex={-1} value={value} aria-label={label} aria-readonly="true" />
    <Icon name="lock" size={14} />
  </div>
)
// A heading above a block of details.
const Step = ({ children }) => <div className="cstep"><b>{children}</b></div>
const Status = ({ tone, children }) => <span className={`cstat ${tone}`}><i />{children}</span>

// One question, a few answers: a real radio list. The selected row is filled; the circle shows it is a choice.
function Choice({ label, value, active, onChange, options }) {
  return (
    <div className="cq">
      <div className="cq-q" id={`q-${label}`}>{label}</div>
      <div className="cradios" role="radiogroup" aria-labelledby={`q-${label}`}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={`cradio ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
            <span className="rdot" />
            <span className="rtxt"><b>{o.title}{o.badge && <i className="cfg-badge">{o.badge}</i>}{active === o.value && <i className="cfg-badge use">In use</i>}</b><span>{o.sub}</span><dl className="cfg-meta">{o.meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></span>
          </button>
        ))}
      </div>
    </div>
  )
}

// What a finished connection looks like: who it is, the facts about it, and what you can do with it.
// Demo: how many of the firm's message templates WhatsApp has approved so far.
const TPL_TOTAL = 3
const tplText = (n) => (n === 0 ? 'Waiting for approval' : n < TPL_TOTAL ? `${n} of ${TPL_TOTAL} approved` : 'All approved')

// Choosing a card only shows its details. This bar is the one place where the channel is actually switched.
function UseBar({ text, button, onUse }) {
  return <div className="cfg-use"><span>{text}</span><button className="btn sm" onClick={onUse}>{button}</button></div>
}

function Conn({ icon, name, sub, rows, list, note, actions, status = 'Connected', tone = 'ok' }) {
  return (
    <div className="cfg-conn">
      <div className="cfg-conn-h">
        <span className="cfg-conn-ico">{icon}</span>
        <div><b>{name}</b>{sub && <span>{sub}</span>}</div>
        <Status tone={tone}>{status}</Status>
      </div>
      {list && list[0].number
        ? <div className="cfg-nums" role="table"><div className="cfg-nums-h" role="row"><span>Display name</span><span>WhatsApp number</span></div>{list.map((r, i) => <div className="cfg-nums-r" role="row" key={i}><span>{r.name}</span><span>{r.number}</span></div>)}</div>
        : list
        ? <ul className="cfg-conn-list">{list.map((r, i) => <li key={r.mod || i} className={r.live === false ? 'off' : ''}>{r.mod && <span className={`mod ${r.mod.toLowerCase()}`}>{r.mod}</span>}<span>{r.email || 'Number not added yet'}</span>{r.live === false && <em>Not live yet</em>}</li>)}</ul>
        : <dl className="cfg-conn-d">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      <div className="cfg-conn-f"><span>{note}</span><span className="spacer" />{actions}</div>
    </div>
  )
}

function WhatsAppCard({ say, onSummary }) {
  const [provider, setProvider] = useState('kdk') // the card being looked at
  const [active, setActive] = useState('kdk') // the one messages are actually sent from
  // stage: new (nothing yet), connected (Rampwin handed back the channel ID and API key)
  const [own, setOwn] = useState({ stage: 'new', name: '', number: '', channelId: '' })
  const [rampwin, setRampwin] = useState(false) // the Rampwin window, shown as a demo screen here
  const isOwn = provider === 'own'
  const connect = () => {
    setRampwin(false)
    setActive('own')
    setOwn({ stage: 'connected', name: 'Sharma & Associates', number: '+91 98765 43210', channelId: 'CH-4471', tplDone: 0, at: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })
    say('WhatsApp connected')
  }
  const ownReady = own.stage === 'connected'
  const sum = active === 'kdk' ? ['System default', 'ok', 'Active']
    : own.tplDone < TPL_TOTAL ? [`${own.name} (${own.number})`, 'wait', own.tplDone === 0 ? 'Templates pending' : `${own.tplDone} of ${TPL_TOTAL} templates approved`]
    : [`${own.name} (${own.number})`, 'ok', 'Connected']
  const bannerNote = active === 'own' && own.tplDone < TPL_TOTAL ? (own.tplDone === 0 ? 'Until the templates are approved, messages go out from the system default number.' : 'Messages without an approved template go out from the system default number.') : null
  const parts = active === 'kdk' ? null : [['Display name', own.name], ['WhatsApp number', own.number]]
  const help = !isOwn
    ? (active === 'own' ? ['Your own number stays connected. You can switch back to it any time.'] : ['Your clients see this number as the sender.', 'Nothing to set up. It works now.'])
    : !ownReady
      ? ['You connect your number once, in a new window.', 'Until you connect, messages keep going from the system default number.']
      : active !== 'own'
        ? ['Your number is connected but not in use.', 'Messages are going out from the system default number. Use the button to switch.']
      : own.tplDone === 0
        ? ['Your number is connected.', 'Until a template is approved, its messages go out from the system default number.']
        : own.tplDone < TPL_TOTAL
          ? ['Messages with an approved template go out from your number.', 'The rest go out from the system default number until their template is approved.']
        : ['Messages now go out from your number.', 'You can disconnect at any time. Messages then go out from the system default number again.']
  useEffect(() => { onSummary({ from: sum[0], tone: sum[1], label: sum[2], help, parts, note: bannerNote }) }, [sum.join('|'), help.join('|')])
  return (
    <section className="cfgcard">
      <Choice label="How should we send WhatsApp messages?" value={provider} active={active} onChange={setProvider} options={[
        { value: 'kdk', title: 'System default', sub: 'Use the standard system WhatsApp number. Ready to use.', meta: [['Sent from', 'System number'], ['Setup', 'None']] },
        { value: 'own', title: 'Your own number', sub: 'Messages come from your firm\'s WhatsApp number.', meta: [['Sent from', own.stage === 'connected' ? own.number : 'Your firm\'s number'], ['Setup', own.stage !== 'connected' ? 'Connect in a new window' : own.tplDone === 0 ? 'Templates pending' : own.tplDone < TPL_TOTAL ? `${own.tplDone} of ${TPL_TOTAL} approved` : 'Done']] },
      ]} />

      {!isOwn && active === 'own' && <UseBar text="Messages are now sent from your own number." button="Use system default instead" onUse={() => { setActive('kdk'); say('Messages will now be sent from the system default number') }} />}
      {isOwn && ownReady && active !== 'own' && <UseBar text="Your number is connected but not in use. Messages are sent from the system default number." button="Use my number" onUse={() => { setActive('own'); say('Messages will now be sent from your number') }} />}

      {!isOwn && (
        <Conn icon={<ChannelIcon ch="wa" size={22} />} name="Number your WhatsApp messages are sent from" status={active === 'kdk' ? 'Active' : 'Not in use'} tone={active === 'kdk' ? 'ok' : 'off'}
          list={WA_DEFAULT}
          note="Managed by KDK. Nothing for you to do." />
      )}

      {isOwn && own.stage === 'new' && (
        <div className="cdetail">
          <Step>Connect your WhatsApp number</Step>
          <ol className="cflow">
            <li><b>Click the button below.</b> A new window opens.</li>
            <li><b>Finish the setup there.</b> Link your WhatsApp Business number.</li>
            <li><b>Come back here.</b> We get the connection details on our own. You do not need to copy or paste anything.</li>
          </ol>
          <div className="cfoot"><span className="muted small">Until you connect, messages keep going from the system default number.</span><span className="spacer" />
            <button className="btn sm" onClick={() => setRampwin(true)}>Connect your number</button>
          </div>
        </div>
      )}

      {isOwn && own.stage === 'connected' && (
        <Conn icon={<ChannelIcon ch="wa" size={22} />} name="Your connection" status={active === 'own' ? 'Connected' : 'Not in use'} tone={active === 'own' ? 'ok' : 'off'}
          rows={[['WhatsApp number', own.number], ['Display name', own.name], ['Message templates', own.tplDone < TPL_TOTAL ? <span className="cfg-tpl"><Status tone="wait">{tplText(own.tplDone)}</Status><button className="link" onClick={() => { const n = own.tplDone === 0 ? 2 : TPL_TOTAL; setOwn({ ...own, tplDone: n }); say(n === TPL_TOTAL ? 'All templates approved' : `${n} of ${TPL_TOTAL} templates approved`) }}>Check status</button></span> : <Status tone="ok">All approved</Status>]]}
          note={own.tplDone === 0 ? 'Until the templates are approved, messages go out from the system default number.' : own.tplDone < TPL_TOTAL ? 'Messages with an approved template go out from your number. The rest go out from the system default number.' : 'Messages now go out from your number.'}
          actions={<>
            <button className="btn line sm" disabled={own.tplDone === 0} title={own.tplDone === 0 ? 'Available after a template is approved' : undefined} onClick={() => say('Test message sent to your own WhatsApp number')}><Icon name="send" size={14} />Send test message</button>
            <button className="btn line sm" onClick={() => { setOwn({ stage: 'new', name: '', number: '', channelId: '', at: '' }); setActive('kdk'); say('Disconnected. Messages go out from the system default number.') }}>Disconnect</button>
          </>} />
      )}

      {rampwin && (
        <div className="rwback" role="dialog" aria-label="WhatsApp setup (demo screen)">
          <div className="rwwin">
            <div className="rwbar"><b>Connect your WhatsApp number</b><span className="muted small">Demo screen. In the real flow this is the provider's own window.</span><span className="spacer" /><button className="link" onClick={() => setRampwin(false)}>Close</button></div>
            <div className="rwbody">
              <p><b>Link your WhatsApp Business number</b></p>
              <p className="muted small">The user links their number here. When it is done, we get the channel ID and API key on our own.</p>
              <button className="btn" onClick={connect}>Finish setup (demo)</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// A value the user has to copy somewhere else: shown in a read-only box with a copy button inside it.
function CopyField({ label, value, say }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => {})
    setDone(true); say(`${label} copied`); setTimeout(() => setDone(false), 1600)
  }
  return (
    <div className="cfg-copy">
      <div className="cfg-copy-box">
        <input readOnly value={value} onFocus={(e) => e.target.select()} aria-label={label} />
        <button type="button" onClick={copy} title={`Copy ${label.toLowerCase()}`} aria-label={`Copy ${label.toLowerCase()}`}><Icon name={done ? 'check' : 'copy'} size={16} /></button>
      </div>
    </div>
  )
}

const DNS = (d) => [
  { type: 'TXT', host: `zeptomail._domainkey.${d}`, value: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8x3demo…' },
  { type: 'CNAME', host: `bounce.${d}`, value: 'bounce.zeptomail.in' },
]

function EmailCard({ say, onSummary }) {
  const [provider, setProvider] = useState('kdk') // the card being looked at
  const [active, setActive] = useState('kdk') // the one emails are actually sent from
  const [replyTo, setReplyTo] = useState('')
  const [own, setOwn] = useState({ domain: '', local: '', name: '', status: 'new' }) // new, pending, checking, failed, verified
  const tries = useRef(0)
  const isOwn = provider === 'own'
  const isSmtp = provider === 'smtp'
  const [smtp, setSmtp] = useState({ host: '', port: '587', security: 'starttls', user: '', pass: '', name: '', from: '', status: 'new', at: '' }) // new, connecting, failed, connected
  const [editSmtp, setEditSmtp] = useState(true)
  const smtpTries = useRef(0)
  const d = own.domain.trim().toLowerCase()
  const personal = PERSONAL.includes(d)
  const valid = d && own.local.trim() && own.name.trim() && !personal
  const set = (p) => setOwn({ ...own, ...p })
  const check = () => {
    set({ status: 'checking' })
    setTimeout(() => {
      tries.current += 1
      const ok = tries.current > 1
      setOwn((o) => ({ ...o, status: ok ? 'verified' : 'failed' })); if (ok) setActive('own')
      say(ok ? 'Domain verified. Email will now be sent from it.' : 'Still not found. DNS changes can take a day or two. Try again later.')
    }, 1400)
  }
  const tag = { new: ['wait', 'Not set up'], pending: ['wait', 'Waiting for DNS records'], checking: ['wait', 'Checking…'], failed: ['bad', 'Not found yet'], verified: ['ok', 'Verified'] }[own.status]
  const [replyDraft, setReplyDraft] = useState('')
  const draft = replyDraft.trim()
  const replyOk = /^\S+@\S+\.\S+$/.test(draft)
  const replyBad = draft && !replyOk
  const saveReply = () => { if (!replyOk || draft === replyTo) return; setReplyTo(draft); say('Reply-to email saved') }
  const reply = (
    <Field label="Reply-to email" hint="When a client replies to your email, the reply goes to this address. Use an inbox you check.">
      <div className="cfg-inline">
        <input type="email" className={replyBad ? 'bad' : ''} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveReply()} placeholder="you@yourfirm.com" aria-label="Reply-to email" />
        <button className="btn sm" disabled={!replyOk || draft === replyTo} onClick={saveReply}>Save</button>
      </div>
      {replyBad && <p className="cerr">Enter a valid email, like name@yourfirm.com.</p>}
      {replyTo && draft === replyTo && <p className="cok">Saved. Replies go to {replyTo}.</p>}
      {!replyTo && !draft && <p className="muted small">Not set yet.</p>}
    </Field>
  )
  const full = `${own.local.trim()}@${d}`
  const sm = (p) => setSmtp({ ...smtp, ...p })
  const PORT = { starttls: '587', ssl: '465', none: '25' }
  const pickSec = (v) => sm({ security: v, port: smtp.port === PORT[smtp.security] ? PORT[v] : smtp.port })
  const smtpValid = smtp.host.trim() && Number(smtp.port) > 0 && smtp.user.trim() && smtp.pass && smtp.name.trim() && /^\S+@\S+\.\S+$/.test(smtp.from.trim())
  const connect = () => {
    sm({ status: 'connecting' })
    setTimeout(() => {
      smtpTries.current += 1
      const ok = smtpTries.current > 1
      setSmtp((o) => ({ ...o, status: ok ? 'connected' : 'failed', at: ok ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : o.at })); if (ok) setActive('smtp'); if (ok) setEditSmtp(false)
      say(ok ? 'Connected. Email will go through your server from now on.' : 'Could not connect to your mail server')
    }, 1400)
  }
  const SEC = { starttls: 'STARTTLS', ssl: 'SSL/TLS', none: 'No encryption' }
  const ownReady = own.status === 'verified'
  const smtpReady = smtp.status === 'connected'
  const label = { kdk: 'the system default address', own: full, smtp: smtp.from }
  const sum = active === 'smtp' ? [smtp.from, 'ok', 'Connected']
    : active === 'own' ? [full, 'ok', 'Verified']
    : ['System default', 'ok', 'Active']
  const ready = { kdk: true, own: ownReady, smtp: smtpReady }
  const notInUse = ready[provider] && active !== provider
  const help = notInUse
    ? [`This one is set up but not in use.`, `Emails are going out from ${label[active]}. Use the button to switch.`]
    : isSmtp
      ? ['Use the server details from your email provider.', 'Some providers need an app password instead of your normal password.', 'Until it connects, email keeps going from the default address.']
      : isOwn
        ? ['You add two DNS records at your domain provider.', 'DNS changes can take up to a day or two to work.', 'Use a domain your firm owns. Personal addresses like Gmail do not work.']
        : ['Each module sends from its own default address.', 'Replies go to the reply-to address, if you set one.']
  useEffect(() => { onSummary({ from: sum[0], tone: sum[1], label: sum[2], help }) }, [sum.join('|'), help.join('|')])
  return (
    <section className="cfgcard">
      <Choice label="How should we send emails?" value={provider} active={active} onChange={setProvider} options={[
        { value: 'kdk', title: 'System default', sub: 'Use the standard system email address. Ready to use.', meta: [['Sent from', 'System address'], ['Setup', 'None']] },
        { value: 'own', title: 'Your own domain', sub: 'Emails come from an address on your firm\'s domain.', meta: [['Sent from', own.status === 'verified' ? full : 'you@yourfirm.com'], ['Setup', own.status === 'verified' ? 'Done' : own.status === 'new' ? 'Add 2 DNS records' : 'Waiting for DNS records']] },
        { value: 'smtp', title: 'Your own SMTP server', sub: 'Emails go through your own mail server.', meta: [['Sent from', smtp.status === 'connected' ? smtp.from : 'Your mail server'], ['Setup', smtp.status === 'connected' ? 'Done' : 'Enter server details']] },
      ]} />

      {notInUse && <UseBar text={provider === 'kdk' ? `Emails are now sent from ${label[active]}.` : `This option is set up but not in use. Emails are sent from ${label[active]}.`} button={provider === 'kdk' ? 'Use system default instead' : 'Use this'} onUse={() => { setActive(provider); say(provider === 'kdk' ? 'Emails will now be sent from the system default address' : `Emails will now be sent from ${label[provider]}`) }} />}

      {provider === 'kdk' && (
        <div className="cfg-stack">
          <Conn icon={<ChannelIcon ch="email" size={20} />} name="Addresses your emails are sent from" status={active === 'kdk' ? 'Active' : 'Not in use'} tone={active === 'kdk' ? 'ok' : 'off'}
            list={DEFAULT_FROM}
            note="Managed by KDK. Nothing for you to do." />
          <div className="cdetail">{reply}</div>
        </div>
      )}

      {isSmtp && smtp.status === 'connected' && !editSmtp && (
        <div className="cfg-stack">
          <Conn icon={<ChannelIcon ch="email" size={20} />} name="Your connection" status={active === 'smtp' ? 'Connected' : 'Not in use'} tone={active === 'smtp' ? 'ok' : 'off'}
            rows={[['SMTP server', `${smtp.host}:${smtp.port}`], ['Security', SEC[smtp.security]], ['Username', smtp.user], ['From name', smtp.name], ['From address', smtp.from]]}
            note="Email goes through your server."
            actions={<>
              <button className="btn line sm" onClick={() => say(`Test email sent to ${replyTo || smtp.from}`)}><Icon name="send" size={14} />Send test email</button>
              <button className="btn line sm" onClick={() => setEditSmtp(true)}>Edit server</button>
            </>} />
          <div className="cdetail">{reply}</div>
        </div>
      )}

      {isSmtp && !(smtp.status === 'connected' && !editSmtp) && (
        <div className="cdetail">
          <Step>Enter your mail server details</Step>
          <div className="cgrid">
            <div className="cgrid host">
              <Field label="SMTP server" hint="From your email provider"><input className="mono" value={smtp.host} onChange={(e) => sm({ host: e.target.value })} placeholder="smtp.yourfirm.com" /></Field>
              <Field label="Port" hint="e.g. 587"><input className="mono" value={smtp.port} onChange={(e) => sm({ port: e.target.value.replace(/\D/g, '') })} placeholder="587" /></Field>
            </div>
            <Field label="Security">
              <div className="cradios row3" role="radiogroup" aria-label="Security">
                {[['starttls', 'STARTTLS', 'Port 587. The usual choice'], ['ssl', 'SSL/TLS', 'Port 465. Encrypted from the start'], ['none', 'None', 'Port 25. Not encrypted']].map(([v, t, ds]) => (
                  <button key={v} role="radio" aria-checked={smtp.security === v} className={`cradio ${smtp.security === v ? 'on' : ''}`} onClick={() => pickSec(v)}><span className="rdot" /><span className="rtxt"><b>{t}</b><span>{ds}</span></span></button>
                ))}
              </div>
            </Field>
            <div className="cgrid two">
              <Field label="Username" hint="Usually your full email address"><input className="mono" value={smtp.user} onChange={(e) => sm({ user: e.target.value })} placeholder="compliance@yourfirm.com" /></Field>
              <Field label="Password" hint="Some providers need an app password"><input type="password" value={smtp.pass} onChange={(e) => sm({ pass: e.target.value })} placeholder="SMTP password" autoComplete="off" /></Field>
            </div>
            <div className="cgrid two">
              <Field label="From name" hint="What clients see as the sender"><input value={smtp.name} onChange={(e) => sm({ name: e.target.value })} placeholder="e.g. Sharma & Associates" /></Field>
              <Field label="From address" hint="Must be allowed by your server"><input className="mono" value={smtp.from} onChange={(e) => sm({ from: e.target.value })} placeholder="compliance@yourfirm.com" /></Field>
            </div>
            {reply}
          </div>
          {smtp.status === 'failed' && <div className="note warnbox">We could not connect to your mail server. Check the server, port, security and password, then try again.</div>}
          <div className="cfoot"><span className="muted small">{smtp.status === 'connecting' ? 'Connecting to your server…' : `Until it connects, email keeps going from the default address of each module.`}</span><span className="spacer" />
            {smtp.status === 'connected' && <button className="btn line sm" onClick={() => setEditSmtp(false)}>Cancel</button>}
            <button className="btn sm" disabled={!smtpValid || smtp.status === 'connecting'} onClick={connect}>{smtp.status === 'connecting' ? 'Connecting…' : 'Save and connect'}</button>
          </div>
        </div>
      )}

      {isOwn && own.status === 'new' && (
        <div className="cdetail">
          <Step>Enter your domain details</Step>
          <div className="cgrid">
            <div className="cgrid two">
              <Field label="Your domain" hint="This is what gets verified">
                <input className={`mono ${personal ? 'bad' : ''}`} value={own.domain} onChange={(e) => set({ domain: e.target.value })} placeholder="yourfirmname.com" />
                {personal && <p className="cerr">{d} is a personal email provider, not a domain you control. Use your firm's own domain.</p>}
              </Field>
              <Field label="Email ID" hint="Joins the domain on its left">
                <div className="cid"><input value={own.local} onChange={(e) => set({ local: e.target.value })} placeholder="compliance" /><span>@{d || 'yourfirmname.com'}</span></div>
              </Field>
            </div>
            <Field label="From name" hint="What clients see as the sender"><input value={own.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sharma & Associates" /></Field>
            {reply}
          </div>
          <div className="cfoot"><span className="muted small">Not set up yet</span><span className="spacer" />
            <button className="btn sm" disabled={!valid} onClick={() => { set({ status: 'pending' }); say('Domain added. Add the two DNS records below.') }}>Add domain</button>
          </div>
        </div>
      )}

      {isOwn && own.status !== 'new' && (
        <div className="cfg-stack">
          <div className="cdetail">
            <Step>Sender details</Step>
            <div className="cgrid two">
              <Field label="From name" hint="What clients see as the sender"><Locked value={own.name} label="From name" /></Field>
              <Field label="From address" hint="On your domain"><Locked value={full} label="From address" /></Field>
            </div>
            {reply}
          </div>

          <div className="cdetail">
            <Step>{own.status === 'verified' ? 'Domain verified' : 'Add DNS records'}</Step>
            {own.status !== 'verified' && (
              <>
                <p className="cfg-help">Add these two records at the place where you manage your domain (for example GoDaddy). It can take up to a day or two to work.</p>
                <div className="cfg-recs" role="table" aria-label="DNS records">
                  <div className="cfg-recs-h" role="row"><span>Type</span><span>Host</span><span>Value</span></div>
                  {DNS(d).map((r) => (
                    <div className="cfg-recs-r" role="row" key={r.type}>
                      <div className="cfg-copy-box cfg-type-box"><input readOnly tabIndex={-1} value={r.type} aria-label="Type" /></div>
                      <CopyField value={r.host} label="Host" say={say} />
                      <CopyField value={r.value} label="Value" say={say} />
                    </div>
                  ))}
                </div>
              </>
            )}
            {own.status === 'failed' && <div className="note warnbox">We could not find these records yet. Check that both are on the right domain, then try again.</div>}
            {own.status === 'verified' && <div className="note">Email to your clients is now sent from <b>{full}</b>.</div>}
          <div className="cfoot"><span className="muted small">{own.status === 'checking' ? 'Checking your domain…' : own.status === 'failed' ? 'Not found yet' : own.status === 'verified' ? 'Sending through your domain' : 'Waiting for DNS records'}</span><span className="spacer" />
            {own.status === 'verified'
              ? <button className="btn line sm" onClick={() => say(`Test email sent to ${replyTo || full}`)}><Icon name="send" size={14} />Send test email</button>
              : <button className="btn line sm" disabled={own.status === 'checking'} onClick={() => { tries.current = 0; setOwn({ domain: '', local: '', name: '', status: 'new' }); if (active === 'own') setActive('kdk') }}>Start over</button>}
            {own.status !== 'verified' && <button className="btn sm" disabled={own.status === 'checking'} onClick={check}>{own.status === 'checking' ? 'Checking…' : own.status === 'failed' ? 'Check again' : 'Check now'}</button>}
          </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Configuration() {
  const [toast, say] = useToast()
  const [tab, setTab] = useState('wa')
  const [sum, setSum] = useState({ wa: { from: '', tone: 'ok', label: '' }, email: { from: '', tone: 'ok', label: '' } })
  const put = (k) => (v) => setSum((o) => ({ ...o, [k]: v }))
  const Tab = ({ k, icon, name }) => (
    <button role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
      {icon}{name}<i className={`cfg-dot ${sum[k].tone}`} title={sum[k].label} />
    </button>
  )
  const cur = sum[tab]
  return (
    <main className="page cfgpage">
      <div className="crumbs"><a href="#/">← Back to Client Communications</a></div>
      <header className="top">
        <div>
          <h1><span className="titleicon"><Icon name="plug" size={20} /></span>Configuration</h1>
          <p className="muted">Choose where your clients' WhatsApp messages and emails are sent from. This applies to your whole firm.</p>
        </div>
      </header>
      <div className="cfgcol">
        <div className="ctabs" role="tablist" aria-label="Channel">
          <Tab k="wa" icon={<ChannelIcon ch="wa" size={17} />} name="WhatsApp" />
          <Tab k="email" icon={<ChannelIcon ch="email" size={16} />} name="Email" />
        </div>
        <div className={`cfg-now ${cur.tone}`} aria-live="polite">
          <div>
            <span className="cfg-now-l">{tab === 'wa' ? 'WhatsApp messages are sent from' : 'Emails are sent from'}</span>
            {cur.parts
              ? <div className="cfg-now-p">{cur.parts.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
              : <b>{cur.from}</b>}
            {cur.note && <span className="cfg-now-n">{cur.note}</span>}
          </div>
          <Status tone={cur.tone}>{cur.label}</Status>
        </div>
        <div className="cfg-main">
          <div className="cfg-left">
            <div hidden={tab !== 'wa'}><WhatsAppCard say={say} onSummary={put('wa')} /></div>
            <div hidden={tab !== 'email'}><EmailCard say={say} onSummary={put('email')} /></div>
          </div>
          <aside className="cfg-aside" aria-label="Good to know">
            <b>Good to know</b>
            <ul>{(cur.help || []).map((h) => <li key={h}>{h}</li>)}</ul>
          </aside>
        </div>
      </div>
      <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
    </main>
  )
}
