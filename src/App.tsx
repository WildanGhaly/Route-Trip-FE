import { useEffect, useMemo, useState } from 'react'
import './styles.css'
import TripForm from './components/TripForm'
import MapView from './components/MapView'
import LogCanvas from './components/LogCanvas'
import { planTrip } from './api'
import type { PlanTripResponse, PlanTripRequest } from './types'

export default function App(){
  const [busy, setBusy] = useState(false)
  const [req, setReq] = useState<PlanTripRequest|null>(null)
  const [data, setData] = useState<PlanTripResponse|null>(null)
  const [err, setErr] = useState<string|undefined>()

  // THEME: 'system' by default
  const [themeMode, setThemeMode] = useState<'system'|'light'|'dark'>(() =>
    (localStorage.getItem('themeMode') as any) || 'system'
  )

  // Apply theme based on mode + OS
  useEffect(()=>{
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const applied = themeMode === 'dark' ? 'dark' : themeMode === 'light' ? 'light' : (mql.matches ? 'dark' : 'light')
      document.documentElement.setAttribute('data-theme', applied)
    }
    apply()
    if (themeMode === 'system') {
      mql.addEventListener?.('change', apply)
      return () => mql.removeEventListener?.('change', apply)
    }
  }, [themeMode])

  function cycleTheme(){
    setThemeMode(m => {
      const next = m === 'system' ? 'dark' : m === 'dark' ? 'light' : 'system'
      localStorage.setItem('themeMode', next)
      return next
    })
  }

  // TUTORIAL: closed by default (user can open via Help)
  const [showTut, setShowTut] = useState(false)
  function openTut(){ setShowTut(true) }
  function closeTut(){ setShowTut(false) }

  async function onSubmit(r: PlanTripRequest){
    setBusy(true); setErr(undefined); setData(null); setReq(r)
    try{ const res = await planTrip(r); setData(res) }
    catch(e:any){ setErr(e.message) }
    finally{ setBusy(false) }
  }

  function scrollToMap(){ document.getElementById('map')?.scrollIntoView({behavior:'smooth', block:'start'}) }

  return (
    <div className="container">
      <div className="header">
        <h1>HOS Trip Planner</h1>
        <div className="toolbar">
          <button className="iconbtn" onClick={openTut} aria-label="Open tutorial">❓ Help</button>
          <button className="iconbtn" onClick={cycleTheme} aria-label="Toggle theme">
            {themeMode === 'system' ? '🖥️ System' : themeMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>

      <div className="grid">
        <TripForm onSubmit={onSubmit} busy={busy} />
        <div>
          <div className="card">
            <h3>Summary</h3>
            <div className="section">
              {err && <div style={{color:'#b91c1c', fontWeight:600}}>Error: {err}</div>}
              {data ? (
                <div className="summary">
                  <span className="badge">Distance: {data.route.distance_mi} mi</span>
                  <span className="badge">Drive time: {data.route.duration_hr} h</span>
                  <span className="badge">Days: {data.days.length}</span>
                  <span className="badge">Stops: {data.stops.length}</span>
                </div>
              ) : (
                <div className="note">Fill the form and click <strong>Plan Trip</strong>.</div>
              )}
            </div>
          </div>
          <br />

          <MapView
            busy={busy}
            current={req?.current_location}
            pickup={req?.pickup_location}
            dropoff={req?.dropoff_location}
            polyline={data?.route.polyline ?? null}
          />

          {data && (
            <div className="logs" style={{marginTop:12}}>
              {data.days.map(d => <LogCanvas key={d.index} day={d} />)}
            </div>
          )}
        </div>
      </div>

      {/* Tutorial modal (manual open) */}
      {showTut && (
        <div className="modal-backdrop" onClick={closeTut}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Quick Tutorial</strong>
              <button className="button" onClick={closeTut} style={{padding:'6px 10px'}}>Close</button>
            </div>
            <ol style={{margin:'0 0 12px 20px', lineHeight:1.6}}>
              <li>Enter <strong>Current</strong>, <strong>Pickup</strong>, <strong>Destination</strong>, and your <strong>Cycle Hours</strong>.</li>
              <li>Click <strong>Plan Trip</strong>. The map will blur with a spinner while planning.</li>
              <li>See badges for distance, hours, days, and stops. Click an ELD title to scroll to the map; click an ELD canvas to enlarge.</li>
            </ol>
            <div style={{display:'flex', gap:8}}>
              <button className="button" onClick={()=>{scrollToMap(); closeTut()}}>Scroll to Map</button>
              <button className="iconbtn" onClick={closeTut}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
