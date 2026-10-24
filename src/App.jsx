import { useEffect, useState } from 'react'
import SettingsPage from './components/SettingsPage.jsx'
import WhatsAppLogs from './components/WhatsAppLogs.jsx'

// Two pages in one app, chosen by the link after the #. The settings page stays mounted (hidden) while the logs
// are open, so filters, the page you were on and your changes are still there when you come back.
export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => { setHash(window.location.hash); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const logs = hash.match(/^#\/whatsapp-logs(?:\/(.+))?$/)
  return (
    <>
      {logs && <WhatsAppLogs key={logs[1] || 'list'} runId={logs[1] ? decodeURIComponent(logs[1]) : null} />}
      <div hidden={!!logs}><SettingsPage /></div>
    </>
  )
}
