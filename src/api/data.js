// Sample data (fictional) and the shape of the real data.
//
// A CLIENT has one or more CONTACTS and one or more REGISTRATIONS:
//   GST -> GSTIN (several per client), TDS -> TAN (several), ITR -> PAN (one).
// Settings are kept per registration. A registration uses the client's first contact unless one was picked for it.
// The reports and events each module can send come from the domain team; the lists below are DEMO lists.

export const MODULES = {
  gst: { label: 'GST', idl: 'GSTIN', idp: 'GSTINs' },
  tds: { label: 'TDS', idl: 'TAN', idp: 'TANs' },
  itr: { label: 'ITR', idl: 'PAN', idp: 'PANs' },
}
export const MOD_KEYS = ['gst', 'tds', 'itr']
export const CHANNELS = ['email', 'wa']

// group.rep = scheduled reports (these also get a "send now" button). item.ch = channels the message supports.
export const CATALOG = {
  gst: [
    { name: 'Scheduled reports', rep: true, items: [
      { k: 'r2ab', n: 'GSTR-2A / 2B report' },
      { k: 'rtl', n: 'Tally data', ch: ['email'] }] },
    { name: 'Returns filed', items: [{ k: 'g1', n: 'GSTR-1 filed' }, { k: 'g3b', n: 'GSTR-3B filed' }, { k: 'g9', n: 'GSTR-9 filed' }] },
    { name: 'Notices', items: [{ k: 'nn', n: 'New notice received' }, { k: 'nr', n: 'Notice reply submitted' }] },
    { name: 'Data updates', items: [{ k: 'd2b', n: 'GSTR-2B data updated' }, { k: 'itc', n: 'ITC mismatch found' }] },
    { name: 'Payments and reminders', items: [{ k: 'pay', n: 'Payment received' }, { k: 'due', n: 'Return due date reminder' }] },
  ],
  tds: [
    { name: 'Scheduled reports', rep: true, items: [{ k: 'tsum', n: 'Monthly TDS summary', ch: ['email'] }] },
    { name: 'Returns filed', items: [{ k: 'q24', n: 'Form 24Q filed' }, { k: 'q26', n: 'Form 26Q filed' }, { k: 'q27', n: 'Form 27Q filed' }] },
    { name: 'Payments', items: [{ k: 'chal', n: 'Challan paid' }, { k: 'tdue', n: 'TDS due date reminder' }] },
    { name: 'Certificates', items: [{ k: 'f16', n: 'Form 16 generated' }, { k: 'f16a', n: 'Form 16A generated' }] },
    { name: 'Notices', items: [{ k: 'dn', n: 'Default notice received' }] },
  ],
  itr: [
    { name: 'Scheduled reports', rep: true, items: [{ k: 'tax', n: 'Tax computation summary', ch: ['email'] }] },
    { name: 'Return status', items: [{ k: 'filed', n: 'ITR filed' }, { k: 'ver', n: 'ITR e-verified' }, { k: 'ref', n: 'Refund issued' }] },
    { name: 'Data updates', items: [{ k: 'ais', n: 'Form 26AS / AIS updated' }] },
    { name: 'Notices', items: [{ k: 'int', n: 'Intimation received' }, { k: 'inot', n: 'Notice received' }] },
  ],
}
// Demo only: open /empty to see the page when TDS and ITR have no report or event yet
if (window.location.pathname.replace(/\/+$/, '').endsWith('/empty')) ['tds', 'itr'].forEach((m) => { CATALOG[m] = [] })
const itemCache = {}
// every message of a module as one flat list, each with its channels filled in
export const itemsOf = (m) => (itemCache[m] ??= CATALOG[m].flatMap((g) => g.items.map((i) => ({ ...i, ch: i.ch || CHANNELS, rep: !!g.rep, group: g.name }))))
export const itemOf = (m, k) => itemsOf(m).find((i) => i.k === k)

// ---------- helpers on clients ----------
export const contactOf = (client, reg) => (reg.c ? client.contacts.find((x) => x.id === reg.c) : client.contacts[0])
export const hasChannel = (contact, ch) => (ch === 'email' ? !!contact.email : !!contact.mobile)
export function countsFor(store, m) {
  let e = 0, et = 0, w = 0, wt = 0
  for (const i of itemsOf(m)) {
    if (i.ch.includes('email')) { et++; if (store[i.k].email) e++ }
    if (i.ch.includes('wa')) { wt++; if (store[i.k].wa) w++ }
  }
  return { e, et, w, wt }
}
// the small tag next to a registration's ID: place and type, whichever it has (GST: Gujarat · Regular, ITR: Company)
export const regTag = (r) => [r.label, r.type].filter(Boolean).join(' · ')
export const registrationsOf = (client) => MOD_KEYS.flatMap((m) => client.regs[m].map((r) => ({ m, r })))
export function indexRegistrations(clients) {
  const map = new Map()
  for (const c of clients) for (const m of MOD_KEYS) for (const r of c.regs[m]) map.set(r.id, { c, r, m })
  return map
}

// ---------- sample clients: 9 written by hand, 51 generated ----------
let seed = 7
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(rnd() * 26))).join('')
const C = (id, name, email, mobile) => ({ id, name, email, mobile })
const STATES = [['24', 'Gujarat'], ['27', 'Maharashtra'], ['07', 'Delhi'], ['29', 'Karnataka'], ['33', 'Tamil Nadu'], ['06', 'Haryana'], ['09', 'Uttar Pradesh'], ['03', 'Punjab'], ['08', 'Rajasthan'], ['36', 'Telangana'], ['32', 'Kerala'], ['19', 'West Bengal']]
const TAN_CITIES = ['Ahmedabad', 'Mumbai', 'Delhi', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Kolkata']
// gst: [gstin, state, type, pickedContactId], tds: [tan, city, pickedContactId]
const make = (id, name, pan, contacts, gst, tds, itrLabel) => ({
  id, name, pan, contacts,
  regs: {
    gst: gst.map(([i, label, type, c]) => ({ id: i, label, type: type || 'Regular', c: c || null })),
    tds: tds.map(([i, label, c]) => ({ id: i, label, c: c || null })),
    itr: itrLabel ? [{ id: pan, label: '', type: itrLabel, c: null }] : [], // ITR: the entity type (Company, Firm...) is its type
  },
})
const HAND = [
  make(1, 'Bluestone Traders Private Limited', 'AABCB1234F', [C('a', 'Anil Mehta', 'accounts@bluestone.example', '98250 11122'), C('b', 'Neha Shah', 'neha@bluestone.example', '98250 33445')],
    [['24AABCB1234F1Z5', 'Gujarat'], ['27AABCB1234F1Z8', 'Maharashtra', 'Regular', 'b'], ['07AABCB1234F1ZK', 'Delhi'], ['29AABCB1234F1ZD', 'Karnataka', 'Regular', 'b']], [['AHMB01234C', 'Ahmedabad']], 'Company'),
  make(2, 'Kaveri Textiles', 'AAKFK5678L', [C('a', 'Meena Raman', 'meena@kaveritex.example', '98946 22331')], [['33AAKFK5678L1ZP', 'Tamil Nadu']], [['CHEK05678D', 'Chennai']], 'Firm'),
  make(3, 'Orion Packaging LLP', 'AAOFO4321K', [C('a', 'Sanjay Kulkarni', 'finance@orionpack.example', '99205 44418'), C('b', 'Reema Joshi', '', '99205 77120')],
    [['27AAOFO4321K1Z9', 'Maharashtra'], ['24AAOFO4321K1ZB', 'Gujarat', 'Regular', 'b']], [], 'LLP'),
  make(4, 'Sharma Auto Spares', 'AAHPS9876M', [C('a', 'Rakesh Sharma', 'rakesh@sharmaauto.example', '93122 90001')], [['07AAHPS9876M1ZQ', 'Delhi', 'Composition']], [['DELS09876A', 'Delhi']], 'Individual'),
  make(5, 'Greenleaf Organics', 'AAGCG2468B', [C('a', 'Divya Nair', 'hello@greenleaf.example', '98860 33210')], [['29AAGCG2468B1Z3', 'Karnataka'], ['32AAGCG2468B1Z7', 'Kerala']], [], 'Company'),
  make(6, 'Patel & Sons Hardware', 'AAEFP1357Q', [C('a', 'Hitesh Patel', '', '98791 55002')], [['24AAEFP1357Q1Z8', 'Gujarat', 'Composition']], [], 'HUF'),
  make(7, 'Zenith Logistics Limited', 'AAZCZ8642D', [C('a', 'Ritu Arora', 'ops@zenithlog.example', '99100 71234'), C('b', 'Karan Bedi', 'karan@zenithlog.example', '99100 71999'), C('c', 'Pooja Sethi', 'pooja@zenithlog.example', '99100 71555')],
    [['06AAZCZ8642D1Z1', 'Haryana'], ['07AAZCZ8642D1Z4', 'Delhi', 'Regular', 'b'], ['09AAZCZ8642D1Z0', 'Uttar Pradesh', 'Regular', 'c'], ['03AAZCZ8642D1ZG', 'Punjab'], ['08AAZCZ8642D1ZM', 'Rajasthan'], ['36AAZCZ8642D1ZP', 'Telangana'], ['32AAZCZ8642D1ZV', 'Kerala']],
    [['DELZ08642A', 'Delhi'], ['MUMZ08642B', 'Mumbai', 'b']], 'Company'),
  make(8, 'Lotus Handicrafts', 'AALPL7531R', [C('a', 'Kavita Joshi', 'lotus.craft@example.com', '')], [['08AALPL7531R1ZN', 'Rajasthan', 'Composition']], [], 'Individual'),
  make(9, 'Nimbus Software Services', 'AANCN9513H', [C('a', 'Arjun Reddy', 'billing@nimbus.example', '90300 11765')], [['36AANCN9513H1Z6', 'Telangana']], [['HYDN09513E', 'Hyderabad']], 'Company'),
]
const NAME_A = ['Aarav', 'Bharat', 'Chandra', 'Devi', 'Eastern', 'Fortune', 'Gupta', 'Himalaya', 'Indus', 'Jai', 'Krishna', 'Lakshmi', 'Metro', 'Omkar', 'Prime', 'Royal', 'Shree', 'Tulsi', 'Unity', 'Vishal']
const NAME_B = ['Traders', 'Enterprises', 'Industries', 'Textiles', 'Agencies', 'Foods', 'Motors', 'Pharma', 'Constructions', 'Logistics', 'Electricals', 'Exports']
const SUFFIX = ['', ' Private Limited', ' LLP', ' & Co', ' Limited']
const PEOPLE = ['Rahul Verma', 'Priya Iyer', 'Amit Shah', 'Neha Gupta', 'Karan Malhotra', 'Sunita Rao', 'Vikram Singh', 'Anjali Desai', 'Rohit Nair', 'Pooja Kapoor']
function generated() {
  const out = []
  for (let i = 10; i <= 60; i++) {
    const name = pick(NAME_A) + ' ' + pick(NAME_B) + pick(SUFFIX)
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12)
    const pan = letters(5) + String(1000 + (i * 37) % 9000) + letters(1)
    const nc = 1 + Math.floor(rnd() * 3)
    const contacts = Array.from({ length: nc }, (_, j) => {
      const n = pick(PEOPLE)
      return C('abc'[j], n, rnd() < 0.06 ? '' : n.split(' ')[0].toLowerCase() + j + '@' + slug + '.example', rnd() < 0.06 ? '' : '9' + Math.floor(1000 + rnd() * 8999) + ' ' + Math.floor(10000 + rnd() * 89999))
    })
    const r = rnd(), ng = r < 0.4 ? 1 : r < 0.7 ? 2 : r < 0.85 ? 3 : 4 + Math.floor(rnd() * 5), used = new Set()
    const gst = Array.from({ length: ng }, () => {
      let s
      do { s = pick(STATES) } while (used.has(s[0]) && used.size < STATES.length)
      used.add(s[0])
      return [s[0] + pan + '1Z' + letters(1), s[1], rnd() < 0.8 ? 'Regular' : 'Composition', rnd() < 0.3 && nc > 1 ? contacts[1].id : null]
    })
    const nt = Math.floor(rnd() * 3)
    const tds = Array.from({ length: Math.min(nt, rnd() < 0.5 ? 1 : 2) }, () => [letters(4) + String(10000 + Math.floor(rnd() * 89999)) + letters(1), pick(TAN_CITIES), null])
    out.push(make(i, name, pan, contacts, gst, tds, pick(['Company', 'Firm', 'Individual', 'LLP', 'HUF'])))
  }
  return out
}

// all starting data: clients, every registration's settings, and the defaults for new clients
export function buildData() {
  seed = 7 // same clients every time, so the logs page can build its own copy of the people
  const clients = [...HAND, ...generated()]
  const defaults = {}
  for (const m of MOD_KEYS) { defaults[m] = {}; for (const i of itemsOf(m)) defaults[m][i.k] = { email: i.ch.includes('email') && rnd() < 0.5, wa: i.ch.includes('wa') && rnd() < 0.3 } }
  const settings = {}
  for (const c of clients) for (const m of MOD_KEYS) for (const r of c.regs[m]) {
    settings[r.id] = {}
    const ct = contactOf(c, r) // a contact with no email / no mobile number cannot have that channel on
    for (const i of itemsOf(m)) settings[r.id][i.k] = { email: !!ct.email && i.ch.includes('email') && rnd() < 0.5, wa: !!ct.mobile && i.ch.includes('wa') && rnd() < 0.35 }
  }
  return { clients, settings, defaults }
}
