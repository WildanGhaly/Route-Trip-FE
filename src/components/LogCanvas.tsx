import { useEffect, useRef, useState, useCallback } from 'react'
import type { DayPlan, Segment, DutyStatus } from '../types'

/** Layout constants */
const ROWS: DutyStatus[] = ['off','sleeper','driving','on_duty']
const TOP = 24, BOTTOM_PAD = 26
const LEFT_GUTTER = 80, RIGHT_PAD = 12    // space for lane labels & right label

function toMin(hhmm: string) {
  const [h,m] = hhmm.split(':').map(Number)
  return h*60 + m
}

/** Split segments that pass midnight; keep order by start time */
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

/** HiDPI canvas scaler */
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

/** Responsive width via ResizeObserver */
function useContainerWidth(ref: React.RefObject<HTMLDivElement>, minH=260) {
  const [dims, setDims] = useState({ w: 960, h: minH })
  useEffect(()=>{
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(entries=>{
      const cr = entries[0].contentRect
      // keep a pleasant aspect ratio while avoiding blank
      const w = Math.max(600, Math.round(cr.width))
      const h = Math.max(minH, Math.round(Math.min(420, w*0.24)))
      setDims({ w, h })
    })
    ro.observe(el)
    return ()=> ro.disconnect()
  }, [ref, minH])
  return dims
}

export default function LogCanvas({ day }: { day: DayPlan }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { w: W, h: H } = useContainerWidth(wrapRef, 260)

  const ref = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(false)

  const drawGrid = useCallback((ctx:CanvasRenderingContext2D)=>{
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

    // hour grid
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
    for (let h=0; h<=24; h++) {
      const x = LEFT_GUTTER + (innerW/24)*h
      ctx.beginPath(); ctx.moveTo(x, TOP-10); ctx.lineTo(x, bottom+10); ctx.stroke()
    }
    // lane separators
    Object.values(rowY).forEach(y=>{
      ctx.beginPath(); ctx.moveTo(LEFT_GUTTER, y); ctx.lineTo(W-RIGHT_PAD, y); ctx.stroke()
    })

    // labels
    ctx.fillStyle = '#334155'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'
    ROWS.forEach((r,i)=> ctx.fillText(r.toUpperCase(), 8, TOP + laneH*(i+0.2)))
    for (let h=0; h<=24; h+=2) {
      const x = LEFT_GUTTER + (innerW/24)*h
      if (h === 24) {
        ctx.textAlign = 'right'
        ctx.fillText('24', x-2, bottom+18)
        ctx.textAlign = 'left'
      } else {
        ctx.fillText(String(h).padStart(2,'0'), x+2, bottom+18)
      }
    }

    ctx.restore()
    return { rowY, innerW, bottom }
  }, [W, H])

  const draw = useCallback(()=>{
    const c = ref.current; if (!c) return
    const ctx = useHidpiCanvas(c, W, H); if (!ctx) return

    const { rowY, innerW } = drawGrid(ctx)
    const xFor = (mm:number)=> LEFT_GUTTER + innerW * (mm/1440)

    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 3

    const list = normalizeSegments(day.segments)

    // If the first segment starts after 00:00 → prefill OFF from 00:00 to first start
    if (list.length === 0 || toMin(list[0].t0) > 0) {
      const firstStart = list.length ? toMin(list[0].t0) : 1440
      list.unshift({ t0:'00:00', t1: `${String(Math.floor(firstStart/60)).padStart(2,'0')}:${String(firstStart%60).padStart(2,'0')}`, status:'off', label:'' })
    }

    let cursorX: number | null = null
    let cursorY: number | null = null

    for (const s of list) {
      const x0 = xFor(toMin(s.t0))
      const x1 = xFor(toMin(s.t1))
      const y  = rowY[s.status]

      // reset pen if time goes backward (after midnight split)
      if (cursorX !== null && x0 < cursorX) { cursorX = null; cursorY = null }

      // bridge horizontally from previous x to this x0
      if (cursorX !== null && cursorY !== null && cursorX !== x0) {
        ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(x0, cursorY); ctx.stroke()
      }
      // vertical transition
      if (cursorX !== null && cursorY !== null && cursorY !== y) {
        ctx.beginPath(); ctx.moveTo(x0, cursorY); ctx.lineTo(x0, y); ctx.stroke()
      }

      // main segment
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()

      // label
      if (s.label) {
        const labelX = Math.max(x0 + 4, LEFT_GUTTER + 6)
        ctx.fillStyle = '#1f2937'; ctx.font = '12px system-ui'
        ctx.fillText(s.label, labelX, y - 10)
      }

      cursorX = x1; cursorY = y
    }

    // Last-day rule: always end the day on OFF to 24:00
    const endX = xFor(1440)
    if (cursorX === null || cursorY === null) {
      // no segments at all → draw full OFF
      ctx.beginPath(); ctx.moveTo(xFor(0), rowY.off); ctx.lineTo(endX, rowY.off); ctx.stroke()
    } else if (cursorX < endX) {
      // vertical into OFF, then to 24:00
      if (cursorY !== rowY.off) {
        ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(cursorX, rowY.off); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(cursorX, rowY.off); ctx.lineTo(endX, rowY.off); ctx.stroke()
    }
  }, [day, W, H, drawGrid])

  useEffect(()=>{ draw() }, [draw])

  // Modal canvas
  const modalRef = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    if (!open) return
    // lock scroll behind modal
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const c = modalRef.current; if (c) {
      const ctx = useHidpiCanvas(c, Math.min(window.innerWidth*0.9, 1600), 360)
      if (ctx) {
        // re-use draw logic at the current modal CSS size
        // quick hack: redraw into modal using the same function but with its own width/height
        // We replicate core parts for modal:
        const Wm = c.clientWidth, Hm = 360
        const innerW = Wm - LEFT_GUTTER - RIGHT_PAD
        const laneH = (Hm - BOTTOM_PAD - TOP) / ROWS.length
        const rowY: Record<DutyStatus, number> = {
          off: TOP + laneH*0.5, sleeper: TOP + laneH*1.5, driving: TOP + laneH*2.5, on_duty: TOP + laneH*3.5
        }
        const xFor = (mm:number)=> LEFT_GUTTER + innerW * (mm/1440)
        // grid
        ctx.clearRect(0,0,Wm,Hm); ctx.save(); ctx.translate(.5,.5); ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1
        for (let h=0; h<=24; h++){ const x=LEFT_GUTTER+(innerW/24)*h; ctx.beginPath(); ctx.moveTo(x,TOP-10); ctx.lineTo(x,Hm-BOTTOM_PAD+10); ctx.stroke() }
        Object.values(rowY).forEach(y=>{ ctx.beginPath(); ctx.moveTo(LEFT_GUTTER,y); ctx.lineTo(Wm-RIGHT_PAD,y); ctx.stroke() })
        ctx.fillStyle='#334155'; ctx.font='12px system-ui'; ctx.textAlign='left'
        ROWS.forEach((r,i)=> ctx.fillText(r.toUpperCase(), 8, TOP + laneH*(i+0.2)))
        for (let h=0; h<=24; h+=2){ const x=LEFT_GUTTER+(innerW/24)*h; if(h===24){ctx.textAlign='right';ctx.fillText('24',x-2,Hm-8);ctx.textAlign='left'} else {ctx.fillText(String(h).padStart(2,'0'),x+2,Hm-8)}}
        ctx.restore()
        // segments (same rules)
        let list = normalizeSegments(day.segments)
        if (list.length === 0 || toMin(list[0].t0) > 0) {
          const firstStart = list.length ? toMin(list[0].t0) : 1440
          list.unshift({ t0:'00:00', t1:`${String(Math.floor(firstStart/60)).padStart(2,'0')}:${String(firstStart%60).padStart(2,'0')}`, status:'off', label:'' })
        }
        ctx.strokeStyle='#111827'; ctx.lineWidth=3
        let cursorX:number|null=null, cursorY:number|null=null
        for (const s of list){
          const x0=xFor(toMin(s.t0)), x1=xFor(toMin(s.t1)), y=rowY[s.status]
          if (cursorX!==null && x0<cursorX){cursorX=null;cursorY=null}
          if (cursorX!==null && cursorY!==null && cursorX!==x0){ctx.beginPath();ctx.moveTo(cursorX,cursorY);ctx.lineTo(x0,cursorY);ctx.stroke()}
          if (cursorX!==null && cursorY!==null && cursorY!==y){ctx.beginPath();ctx.moveTo(x0,cursorY);ctx.lineTo(x0,y);ctx.stroke()}
          ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke()
          if (s.label){const labelX=Math.max(x0+4,LEFT_GUTTER+6); ctx.fillStyle='#1f2937'; ctx.font='12px system-ui'; ctx.fillText(s.label,labelX,y-10)}
          cursorX=x1; cursorY=y
        }
        const endX=xFor(1440)
        if (cursorX===null || cursorY===null){
          ctx.beginPath(); ctx.moveTo(xFor(0), rowY.off); ctx.lineTo(endX, rowY.off); ctx.stroke()
        } else if (cursorX<endX){
          if (cursorY!==rowY.off){ctx.beginPath();ctx.moveTo(cursorX,cursorY);ctx.lineTo(cursorX,rowY.off);ctx.stroke()}
          ctx.beginPath(); ctx.moveTo(cursorX,rowY.off); ctx.lineTo(endX,rowY.off); ctx.stroke()
        }
      }
    }
    const onKey = (e:KeyboardEvent)=> { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return ()=>{
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, day])

  function scrollToMap() {
    document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="card">
      <h3 onClick={scrollToMap} style={{cursor:'pointer'}}>
        ELD Log — Day {day.index} <span className="note">({day.date})</span> <span className="note">— click title to view map</span>
      </h3>
      <div className="section" ref={wrapRef}>
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
            <canvas ref={modalRef} />
            <div className="note" style={{marginTop:8}}>{day.notes}</div>
          </div>
        </div>
      )}
    </div>
  )
}
