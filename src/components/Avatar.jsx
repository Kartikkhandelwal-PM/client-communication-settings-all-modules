// A round avatar with the first letters of a contact's name, and a stack of them with a "+count".
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const tone = (n) => [...n].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 5, 0)

export const Avatar = ({ name, size }) => (
  <span className={`av av${tone(name)}`} style={size ? { width: size, height: size, fontSize: Math.round(size * 0.42) } : undefined} title={name} aria-hidden="true">{initials(name)}</span>
)

// up to `max` avatars, then "+N" for the rest
export function AvatarStack({ contacts, max = 2 }) {
  const rest = contacts.slice(max)
  return (
    <span className="avs" aria-label={contacts.map((c) => c.name).join(', ')}>
      {contacts.slice(0, max).map((c) => <Avatar key={c.id} name={c.name} />)}
      {rest.length > 0 && <span className="av plus" title={rest.map((c) => c.name).join(', ')}>+{rest.length}</span>}
    </span>
  )
}

export const ModuleTag = ({ module, label, children }) => <span className={`mod ${module}`}>{children ?? label}</span>
