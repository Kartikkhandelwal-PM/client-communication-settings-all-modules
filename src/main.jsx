import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './settings.css'

// Hover tip for table cells whose text is cut off ("..."): shows the full text right away
const tip = Object.assign(document.createElement('div'), { className: 'celltip', role: 'tooltip' })
document.body.appendChild(tip)
let tipTimer
const hideTip = () => { clearTimeout(tipTimer); tip.classList.remove('show') }
document.addEventListener('mouseover', (e) => {
  const td = e.target.closest?.('table.logs tbody td')
  if (!td) return hideTip()
  const els = [td, ...td.querySelectorAll('.title, .trunc')]
  const cut = els.find((x) => x.scrollWidth > x.clientWidth + 1)
  if (!cut) return hideTip()
  const text = (cut.title || cut.innerText || '').trim()
  if (!text) return hideTip()
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    tip.textContent = text
    const r = td.getBoundingClientRect()
    tip.classList.add('show')
    const w = tip.offsetWidth
    tip.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`
    tip.style.top = `${r.bottom + 4 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 4 : r.bottom + 4}px`
  }, 120)
})
document.addEventListener('mouseleave', hideTip)
window.addEventListener('scroll', hideTip, true)
document.addEventListener('mousedown', hideTip)

createRoot(document.getElementById('root')).render(<App />)
