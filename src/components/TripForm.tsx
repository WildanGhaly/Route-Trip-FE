import { useState } from 'react'
import type { PlanTripRequest } from '../types'

interface Props { onSubmit: (req: PlanTripRequest) => void; busy?: boolean }

export default function TripForm({ onSubmit, busy }: Props) {
  const [form, setForm] = useState<PlanTripRequest>({
    current_location: 'Kansas City, MO',
    pickup_location: 'Denver, CO',
    dropoff_location: 'Los Angeles, CA',
    current_cycle_used_hours: 42,
    assume_distance_mi: 0
  })

  function update<K extends keyof PlanTripRequest>(k:K, v:PlanTripRequest[K]) {
    setForm({ ...form, [k]: v })
  }

  return (
    <div className="card">
      <h3>Trip Inputs</h3>
      <div className="section">
        <label className="label">Current Location</label>
        <input className="input" value={form.current_location}
          onChange={e=>update('current_location', e.target.value)} />

        <label className="label">Pickup Location</label>
        <input className="input" value={form.pickup_location}
          onChange={e=>update('pickup_location', e.target.value)} />

        <label className="label">Dropoff Location</label>
        <input className="input" value={form.dropoff_location}
          onChange={e=>update('dropoff_location', e.target.value)} />

        <label className="label">Current Cycle Used Hours</label>
        <input type="number" className="number" value={form.current_cycle_used_hours}
          onChange={e=>update('current_cycle_used_hours', Number(e.target.value))} />

        {/* <label className="label">Assume Distance (mi) <span className="note">(testing shortcut)</span></label>
        <input type="number" className="number" value={form.assume_distance_mi ?? ''}
          onChange={e=>update('assume_distance_mi', Number(e.target.value))} /> */}

        <div style={{marginTop:12, display:'flex', gap:8}}>
          <button className="button" disabled={busy}
            onClick={()=>onSubmit(form)}>Plan Trip</button>
        </div>
      </div>
    </div>
  )
}