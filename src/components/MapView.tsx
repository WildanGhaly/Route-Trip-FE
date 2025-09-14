import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import pl from 'polyline'

/** Colored marker icons (CDN) */
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
function colorIcon(color: 'blue'|'green'|'red') {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl,
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41],
  })
}
const iconCurrent = colorIcon('blue')
const iconPickup  = colorIcon('green')
const iconDrop    = colorIcon('red')

async function geocode(q:string): Promise<[number,number]|null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!r.ok) return null
  const j = await r.json()
  if (!Array.isArray(j) || !j[0]) return null
  return [Number(j[0].lat), Number(j[0].lon)]
}

function FitBounds({
  line, points
}: {
  line: [number,number][]|null,
  points: Array<[number,number]|null>
}) {
  const map = useMap()
  useEffect(()=>{
    if (line && line.length > 1) {
      map.fitBounds(line as any, { padding: [20,20] })
      return
    }
    const pts = points.filter(Boolean) as [number,number][]
    if (pts.length >= 2) {
      map.fitBounds(pts as any, { padding: [20,20] })
    } else if (pts.length === 1) {
      map.setView(pts[0] as any, 8)
    }
  }, [line, points, map])
  return null
}

interface Props {
  current?: string
  pickup?: string
  dropoff?: string
  polyline?: string | null
  busy?: boolean
}

export default function MapView({ current, pickup, dropoff, polyline, busy }: Props) {
  const [cur,  setCur]  = useState<[number,number]|null>(null)
  const [pick, setPick] = useState<[number,number]|null>(null)
  const [drop, setDrop] = useState<[number,number]|null>(null)

  useEffect(()=>{ current ? geocode(current).then(setCur) : setCur(null) }, [current])
  useEffect(()=>{ pickup  ? geocode(pickup).then(setPick)  : setPick(null) }, [pickup])
  useEffect(()=>{ dropoff ? geocode(dropoff).then(setDrop) : setDrop(null) }, [dropoff])

  // Decoded polyline from backend (if present)
  const decodedLine = useMemo(()=>{
    if (!polyline) return null
    try { return pl.decode(polyline).map(([lat, lon]) => [lat, lon] as [number,number]) }
    catch { return null }
  }, [polyline])

  // Fallback straight segments:
  // - current → pickup
  // - pickup → dropoff
  const fallbackSegments = useMemo(()=>{
    const segs: [ [number,number], [number,number] ][] = []
    if (cur && pick) segs.push([cur, pick])
    if (pick && drop) segs.push([pick, drop])
    return segs
  }, [cur, pick, drop])

  // Bounds: prefer polyline points; else all segment points; else markers
  const lineForBounds = useMemo<[number,number][] | null>(() => {
    if (decodedLine && decodedLine.length > 1) return decodedLine
    if (fallbackSegments.length) return fallbackSegments.flat() as [number,number][]
    return null
  }, [decodedLine, fallbackSegments])

  const center = useMemo(()=> cur || pick || drop || ([39.5,-98.35] as [number,number]), [cur, pick, drop])

  return (
    <div className="card" id="map">
      <h3>Map</h3>
      <div className="map" style={{ position:'relative' }}>
        {/* Blurred map content while busy */}
        <div style={{
          filter: busy ? 'blur(2px) grayscale(0.3)' : 'none',
          transition: 'filter 200ms',
          height: '100%', width: '100%'
        }}>
          <MapContainer center={center as any} zoom={5} style={{height:'100%', width:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
            <FitBounds line={lineForBounds} points={[cur, pick, drop]} />

            {/* Markers */}
            {cur  && <Marker position={cur}  icon={iconCurrent}><Popup>Current: {current}</Popup></Marker>}
            {pick && <Marker position={pick} icon={iconPickup}><Popup>Pickup: {pickup}</Popup></Marker>}
            {drop && <Marker position={drop} icon={iconDrop}><Popup>Destination: {dropoff}</Popup></Marker>}

            {/* Route / Fallback */}
            {decodedLine ? (
              <Polyline positions={decodedLine as any} />
            ) : (
              <>
                {fallbackSegments.map((seg, i) => (
                  <Polyline
                    key={i}
                    positions={seg as any}
                    // dashed pre-pick leg to visually separate it (optional)
                    pathOptions={i === 0 && cur && pick ? { dashArray: '6 6' } : undefined}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>

        {/* Overlay spinner during planning */}
        {busy && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(255,255,255,0.45)', gap:10
          }}>
            <span className="spinner" />
            <span style={{fontWeight:700, color:'#334155'}}>Planning trip…</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="section" style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'}}>
        <Legend color="#2563eb" label="Current (Blue)" />
        <Legend color="#16a34a" label="Pickup (Green)" />
        <Legend color="#dc2626" label="Destination (Red)" />
        <div className="note" style={{marginLeft:8}}>
          No polyline? draw straight segments: <strong>current→pickup</strong> (dashed) and <strong>pickup→destination</strong>.
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color:string, label:string }) {
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
      <span style={{
        width:12, height:12, borderRadius:9999, background:color,
        boxShadow:'0 0 0 2px rgba(0,0,0,0.05)'
      }} />
      <span style={{fontSize:12, color:'#334155'}}>{label}</span>
    </span>
  )
}
