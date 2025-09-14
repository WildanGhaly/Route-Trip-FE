import type { PlanTripRequest, PlanTripResponse } from './types'

const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export async function planTrip(payload: PlanTripRequest): Promise<PlanTripResponse> {
  const resp = await fetch(`${BASE}/api/plan-trip/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return await resp.json()
}