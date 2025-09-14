import { useState } from 'react'
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

  async function onSubmit(r: PlanTripRequest){
    setBusy(true); setErr(undefined); setData(null); setReq(r)
    try{ const res = await planTrip(r); setData(res) }
    catch(e:any){ setErr(e.message) }
    finally{ setBusy(false) }
  }

  return (
    <div className="container">
      <h1 style={{margin:'8px 0 16px'}}>HOS Trip Planner</h1>
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
                <div className="note">Submit the form to generate a plan.</div>
              )}
            </div>
          </div>
          {data && req && (
            <>
              <MapView
                current={req.current_location}
                pickup={req.pickup_location}
                dropoff={req.dropoff_location}
                polyline={data.route.polyline}
              />
              <div className="logs" style={{marginTop:12}}>
                {data.days.map(d => <LogCanvas key={d.index} day={d} />)}
              </div>
            </>
          )}
        </div>
      </div>
      <hr/>
      <div className="note">
        If the backend returns an encoded <code>polyline</code>, we draw it; otherwise we show a straight line between pickup and dropoff.
        Set <code>VITE_API_BASE</code> in <code>.env.local</code> if needed.
      </div>
    </div>
  )
}
