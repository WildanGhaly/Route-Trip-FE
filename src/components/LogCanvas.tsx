import { useEffect, useRef } from 'react'
import type { DayPlan, Segment, DutyStatus } from '../types'

const ROWS: DutyStatus[] = ['off','sleeper','driving','on_duty']
const ROW_Y: Record<DutyStatus, number> = { off:30, sleeper:70, driving:110, on_duty:150 }
const H = 180
const W = 960 // 40px per hour * 24

function toMin(hhmm: string) {
  const [h,m] = hhmm.split(':').map(Number)
  return h*60 + m
}

function drawGrid(ctx:CanvasRenderingContext2D) {
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  // Horizontal bands
  for (const y of Object.values(ROW_Y)) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()
  }
  // Vertical hour marks
  for (let h=0; h<=24; h++) {
    const x = (W/24)*h
    ctx.beginPath(); ctx.moveTo(x,10); ctx.lineTo(x,H-10); ctx.stroke()
  }
  // Labels
  ctx.fillStyle = '#334155'
  ctx.font = '12px system-ui'
  ROWS.forEach((r,i)=> ctx.fillText(r.toUpperCase(), 6, ROW_Y[r]-12))
  for (let h=0; h<=24; h+=2) {
    const x = (W/24)*h
    ctx.fillText(String(h).padStart(2,'0'), x+2, H-4)
  }
}

function drawSegments(ctx:CanvasRenderingContext2D, segs: Segment[]) {
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 3
  let cursorX: number | null = null
  let cursorY: number | null = null
  for (const s of segs) {
    const x0 = (toMin(s.t0)/60)*(W/24)
    const x1 = (toMin(s.t1)/60)*(W/24)
    const y  = ROW_Y[s.status]
    // vertical move if status changed
    if (cursorX !== null && cursorY !== null && cursorX !== x0) {
      ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(x0, cursorY); ctx.stroke()
    }
    if (cursorX !== null && cursorY !== null && cursorY !== y) {
      ctx.beginPath(); ctx.moveTo(x0, cursorY); ctx.lineTo(x0, y); ctx.stroke()
    }
    // horizontal segment
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
    // label
    if (s.label) {
      ctx.fillStyle = '#1f2937'; ctx.font = '12px system-ui'
      ctx.fillText(s.label, x0+4, y-18)
    }
    cursorX = x1; cursorY = y
  }
}

export default function LogCanvas({ day }: { day: DayPlan }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    drawGrid(ctx)
    drawSegments(ctx, day.segments)
  }, [day])
  return (
    <div className="card">
      <h3>ELD Log — Day {day.index} <span className="note">({day.date})</span></h3>
      <div className="section">
        <canvas ref={ref} width={W} height={H} />
        <div className="note" style={{marginTop:8}}>{day.notes}</div>
      </div>
    </div>
  )
}