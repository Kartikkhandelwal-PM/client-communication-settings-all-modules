import { CATALOG, CHANNELS, MODULES } from '../api/data.js'
import { ChannelIcon, Switch } from './ui.jsx'

// Every report and event of one module, in groups, with an Email and a WhatsApp switch each.
// store = { [messageKey]: { email, wa } }. disabled = channels this contact cannot use.
// onSend is given only where "send now" makes sense (scheduled reports on a registration).
export default function MessageList({ module, store, query, disabled = {}, onSwitch, onGroup, onSend }) {
  const q = query.trim().toLowerCase()
  if (!CATALOG[module].length) return <div className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>No reports or events for {MODULES[module].label} yet.</div>
  const groups = CATALOG[module].map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, ch: i.ch || CHANNELS })).filter((i) => !q || i.n.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) })).filter((g) => g.items.length)
  if (!groups.length) return <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No message matches “{query}”.</div>
  return groups.map((g) => {
    // the one button of the group: turn everything on, or, when everything is already on, turn everything off.
    // Channels this contact cannot use are left out of the count, so the button still works for the rest.
    const usable = g.items.reduce((a, i) => a + i.ch.filter((ch) => !disabled[ch]).length, 0)
    const usableOn = g.items.reduce((a, i) => a + i.ch.filter((ch) => !disabled[ch] && store[i.k][ch]).length, 0)
    const allOn = usable > 0 && usableOn === usable
    return (
      <div className="grp" key={g.name}>
        <div className="gh">
          <div className="gname"><b>{g.name}</b></div>
          <button className="link gbtn" disabled={usable === 0} onClick={() => onGroup(g.name, !allOn)}>{allOn ? 'Turn all off' : 'Turn all on'}</button>
        </div>
        {g.items.map((i) => (
          <div className="mrow" key={i.k}>
            <div className="nm">{i.n}{i.d && <small>{i.d}</small>}</div>
            {CHANNELS.map((ch) => (
              <div className="c" key={ch}>
                {!i.ch.includes(ch) ? <span className="na" title="Not available on this channel">—</span> : (
                  <span className="cell">
                    <Switch checked={store[i.k][ch]} disabled={!!disabled[ch]} label={`${i.n} by ${ch === 'wa' ? 'WhatsApp' : 'email'}`} onChange={(v) => onSwitch(i.k, ch, v)} />
                    {g.rep && onSend && (
                      <button className="send" disabled={!!disabled[ch]} onClick={() => onSend(i, ch)} title="Send this report now" aria-label={`Send ${i.n} now`}><ChannelIcon ch={ch} size={ch === 'wa' ? 18 : 16} /></button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  })
}

export const MessageHead = () => (
  <div className="lhead"><span>Message</span><span><ChannelIcon ch="email" size={15} /> Email</span><span><ChannelIcon ch="wa" size={15} /> WhatsApp</span></div>
)
