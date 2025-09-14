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
  line,
  points,
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
  current: string
  pickup: string
  dropoff: string
  polyline?: string | null
}

export default function MapView({ current, pickup, dropoff, polyline }: Props) {
  const [cur,  setCur]  = useState<[number,number]|null>(null)
  const [pick, setPick] = useState<[number,number]|null>(null)
  const [drop, setDrop] = useState<[number,number]|null>(null)

  useEffect(()=>{ geocode(current).then(setCur) }, [current])
  useEffect(()=>{ geocode(pickup).then(setPick) }, [pickup])
  useEffect(()=>{ geocode(dropoff).then(setDrop) }, [dropoff])

  const line = useMemo(()=>{
    if (!polyline) return null
    try {
      // pl.decode returns [ [lat, lon], ... ] with precision 5 by default
      return pl.decode(polyline).map(([lat, lon]) => [lat, lon] as [number,number])
    } catch {
      return null
    }
  }, [polyline])

  const center = useMemo(()=> cur || pick || drop || ([39.5,-98.35] as [number,number]), [cur, pick, drop])
  const fallbackLine = pick && drop ? [pick, drop] : null

  return (
    <div className="card">
      <h3>Map</h3>
      <div className="map">
        <MapContainer center={center as any} zoom={5} style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
          <FitBounds line={line} points={[cur, pick, drop]} />

          {cur  && <Marker position={cur}  icon={iconCurrent}><Popup>Current: {current}</Popup></Marker>}
          {pick && <Marker position={pick} icon={iconPickup}><Popup>Pickup: {pickup}</Popup></Marker>}
          {drop && <Marker position={drop} icon={iconDrop}><Popup>Destination: {dropoff}</Popup></Marker>}

          {line ? (
            <Polyline positions={line as any} />
          ) : (
            fallbackLine && <Polyline positions={fallbackLine as any} />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="section" style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'}}>
        <Legend color="#2563eb" label="Current (Blue)" />
        <Legend color="#16a34a" label="Pickup (Green)" />
        <Legend color="#dc2626" label="Destination (Red)" />
        <div className="note" style={{marginLeft:8}}>
          If no route polyline is returned, we show a straight line between pickup and destination.
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
