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

  // THEME
  const initialTheme = useMemo<'light'|'dark'>(() => {
    const saved = localStorage.getItem('theme') as 'light'|'dark'|null
    if (saved) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])
  const [theme, setTheme] = useState<'light'|'dark'>(initialTheme)
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // TUTORIAL
  const [showTut, setShowTut] = useState<boolean>(() => !localStorage.getItem('hos_tutorial_seen'))
  function openTut(){ setShowTut(true) }
  function closeTut(markSeen = false){
    if (markSeen) localStorage.setItem('hos_tutorial_seen','1')
    setShowTut(false)
  }
  function scrollToMap(){ document.getElementById('map')?.scrollIntoView({behavior:'smooth', block:'start'}) }

  async function onSubmit(r: PlanTripRequest){
    setBusy(true); setErr(undefined); setData(null); setReq(r)
    try{ const res = await planTrip(r); setData(res) }
    catch(e:any){ setErr(e.message) }
    finally{ setBusy(false) }
  }

  return (
    <div className="container">
      {/* Header with theme + tutorial */}
      <div className="header">
        <h1>HOS Trip Planner</h1>
        <div className="toolbar">
          <button className="iconbtn" onClick={openTut} aria-label="Open tutorial">❓ Help</button>
          <button className="iconbtn" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
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

          {/* Map always visible */}
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

      <hr/>
      <div className="note">
        Tip: If your backend is not on <code>http://127.0.0.1:8000</code>, set <code>VITE_API_BASE</code> in <code>.env.local</code>.
      </div>

      {/* Floating help (optional) */}
      <button className="help-fab" onClick={openTut} aria-label="Help & tutorial">❓ Help</button>

      {/* Tutorial modal */}
      {showTut && (
        <div className="modal-backdrop" onClick={()=>closeTut(true)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Quick Tutorial</strong>
              <button className="button" onClick={()=>closeTut(true)} style={{padding:'6px 10px'}}>Got it</button>
            </div>
            <ol style={{margin:'0 0 12px 20px', lineHeight:1.6}}>
              <li><strong>Enter locations</strong>: Current, Pickup, Destination.</li>
              <li>Set your <strong>Current Cycle Used Hours</strong> (0–70).</li>
              <li>Click <strong>Plan Trip</strong>. The map blurs with a spinner while it calculates.</li>
              <li>See the <strong>Summary</strong> badges update (distance, drive time, days, stops).</li>
              <li>On the <strong>Map</strong>, pins are: <em>Blue=Current, Green=Pickup, Red=Destination</em>. Straight segments draw if no polyline.</li>
              <li>Each <strong>ELD Log</strong>: click the canvas to enlarge; click the title to scroll to the map.</li>
              <li>Testing shortcut: set <strong>Assume Distance (mi)</strong> to skip external routing.</li>
            </ol>
            <div style={{display:'flex', gap:8}}>
              <button className="button" onClick={()=>{scrollToMap(); closeTut(true)}}>Scroll to Map</button>
              <button className="iconbtn" onClick={()=>closeTut(true)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
