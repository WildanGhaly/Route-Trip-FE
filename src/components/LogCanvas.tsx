import { useEffect, useRef, useState, useCallback } from 'react'
import type { DayPlan, Segment, DutyStatus } from '../types'

/** layout */
const ROWS: DutyStatus[] = ['off','sleeper','driving','on_duty']
const TOP = 24, BOTTOM_PAD = 24
const LEFT_GUTTER = 80, RIGHT_PAD = 12   // reserve space for lane labels
const W = 960, H = 220                   // CSS scales it responsive

function toMin(hhmm: string) {
  const [h,m] = hhmm.split(':').map(Number)
  return h*60 + m
}

/** split segments that pass midnight; keep order by start time */
function normalizeSegments(segs: Segment[]): Segment[] {
  const out: Segment[] = []
  for (const s of segs) {
    const m0 = toMin(s.t0), m1 = toMin(s.t1)
    if (m1 >= m0) out.push(s)
    else {
      out.push({ ...s, t0: s.t0, t1: '24:00' })
      out.push({ ...s, t0: '00:00', t1: s.t1, label: s.label ? `${s.label} (cont)` : '' })
    }
  }
  return out.sort((a,b)=> toMin(a.t0) - toMin(b.t0))
}

/** HiDPI canvas */
function useHidpiCanvas(canvas: HTMLCanvasElement | null, cssW:number, cssH:number) {
  if (!canvas) return null
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function drawGrid(ctx:CanvasRenderingContext2D){
  ctx.clearRect(0,0,W,H)
  ctx.save()
  ctx.translate(.5,.5)

  const bottom = H - BOTTOM_PAD
  const innerW = W - LEFT_GUTTER - RIGHT_PAD

  // lane Y centers
  const laneH = (bottom - TOP) / ROWS.length
  const rowY: Record<DutyStatus, number> = {
    off:      TOP + laneH*0.5,
    sleeper:  TOP + laneH*1.5,
    driving:  TOP + laneH*2.5,
    on_duty:  TOP + laneH*3.5,
  }

  // vertical hour grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  for (let h=0; h<=24; h++) {
    const x = LEFT_GUTTER + (innerW/24)*h
    ctx.beginPath(); ctx.moveTo(x, TOP-10); ctx.lineTo(x, bottom+10); ctx.stroke()
  }

  // lane separators
  Object.values(rowY).forEach(y=>{
    ctx.beginPath(); ctx.moveTo(LEFT_GUTTER, y); ctx.lineTo(W-RIGHT_PAD, y); ctx.stroke()
  })

  // lane labels in gutter (won’t collide with segment labels anymore)
  ctx.fillStyle = '#334155'; ctx.font = '12px system-ui'
  ROWS.forEach((r,i)=> ctx.fillText(r.toUpperCase(), 8, TOP + laneH*(i+0.2)))
  for (let h=0; h<=24; h+=2) {
    const x = LEFT_GUTTER + (innerW/24)*h
    ctx.fillText(String(h).padStart(2,'0'), x+2, bottom+18)
  }

  ctx.restore()
  return { rowY, innerW, bottom }
}

function drawSegments(ctx:CanvasRenderingContext2D, segs: Segment[]){
  const { rowY, innerW } = drawGrid(ctx)
  const xFor = (mm:number)=> LEFT_GUTTER + innerW * (mm/1440)

  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 3

  let cursorX: number | null = null
  let cursorY: number | null = null

  const list = normalizeSegments(segs)

  for (const s of list) {
    const x0 = xFor(toMin(s.t0))
    const x1 = xFor(toMin(s.t1))
    const y  = rowY[s.status]

    // if time went "backwards" (e.g., after midnight split), lift the pen
    if (cursorX !== null && x0 < cursorX) { cursorX = null; cursorY = null }

    // horizontal bridge from previous x to this x0 at previous Y
    if (cursorX !== null && cursorY !== null && cursorX !== x0) {
      ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(x0, cursorY); ctx.stroke()
    }
    // vertical to new lane
    if (cursorX !== null && cursorY !== null && cursorY !== y) {
      ctx.beginPath(); ctx.moveTo(x0, cursorY); ctx.lineTo(x0, y); ctx.stroke()
    }

    // main segment
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()

    // label (ensure it doesn’t collide with left gutter)
    if (s.label) {
      const labelX = Math.max(x0 + 4, LEFT_GUTTER + 6)
      ctx.fillStyle = '#1f2937'; ctx.font = '12px system-ui'
      ctx.fillText(s.label, labelX, y - 10)
    }

    cursorX = x1; cursorY = y
  }

  // ensure the day is "completed" to 24:00
  if (cursorX !== null && cursorY !== null) {
    const endX = xFor(1440)
    if (cursorX < endX) {
      ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(endX, cursorY); ctx.stroke()
    }
  }
}

export default function LogCanvas({ day }: { day: DayPlan }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(false)

  const render = useCallback(()=>{
    const c = ref.current; if (!c) return
    const ctx = useHidpiCanvas(c, W, H); if (!ctx) return
    drawSegments(ctx, day.segments)
  }, [day])

  useEffect(()=>{ render() }, [render])

  // modal canvas
  const modalRef = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    if (!open) return
    // scroll lock
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const c = modalRef.current; if (!c) return
    const ctx = useHidpiCanvas(c, 1440, 320); if (!ctx) return
    drawSegments(ctx, day.segments)

    const onKey = (e:KeyboardEvent)=> { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return ()=>{
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, day])

  return (
    <div className="card">
      <h3>ELD Log — Day {day.index} <span className="note">({day.date})</span></h3>
      <div className="section">
        <canvas
          ref={ref}
          width={W}
          height={H}
          onClick={()=>setOpen(true)}
          title="Click to enlarge"
          style={{cursor:'zoom-in'}}
        />
        <div className="note" style={{marginTop:8}}>{day.notes}</div>
      </div>

      {open && (
        <div className="eld-modal-backdrop" onClick={()=>setOpen(false)}>
          <div className="eld-modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <strong>ELD Log — Day {day.index} ({day.date})</strong>
              <button className="button" onClick={()=>setOpen(false)} style={{padding:'6px 10px'}}>✕ Close</button>
            </div>
            <canvas ref={modalRef} width={1440} height={320} />
            <div className="note" style={{marginTop:8}}>{day.notes}</div>
          </div>
        </div>
      )}
    </div>
  )
}
