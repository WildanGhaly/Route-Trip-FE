import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import pl from 'polyline'

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor:[12,41]
})

async function geocode(q:string): Promise<[number,number]|null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!r.ok) return null
  const j = await r.json()
  if (!Array.isArray(j) || !j[0]) return null
  return [Number(j[0].lat), Number(j[0].lon)]
}

function FitBounds({ line, pick, drop }: { line: [number,number][]|null, pick: [number,number]|null, drop: [number,number]|null }){
  const map = useMap()
  useEffect(()=>{
    if (line && line.length > 1){
      map.fitBounds(line as any, { padding: [20,20] })
    } else if (pick && drop){
      map.fitBounds([pick, drop] as any, { padding: [20,20] })
    }
  }, [line, pick, drop, map])
  return null
}

interface Props {
  pickup: string
  dropoff: string
  polyline?: string | null
}

export default function MapView({ pickup, dropoff, polyline }: Props) {
  const [pick, setPick] = useState<[number,number]|null>(null)
  const [drop, setDrop] = useState<[number,number]|null>(null)

  useEffect(()=>{ geocode(pickup).then(setPick) }, [pickup])
  useEffect(()=>{ geocode(dropoff).then(setDrop) }, [dropoff])

  const line = useMemo(()=>{
    if (!polyline) return null
    try {
      // pl.decode returns [ [lat, lon], ... ] with precision 5 by default
      const pts = pl.decode(polyline).map(([lat, lon]) => [lat, lon] as [number,number])
      return pts
    } catch {
      return null
    }
  }, [polyline])

  const center = pick || drop || ([39.5,-98.35] as [number,number])

  return (
    <div className="card">
      <h3>Map</h3>
      <div className="map">
        <MapContainer center={center as any} zoom={5} style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
          <FitBounds line={line} pick={pick} drop={drop} />
          {pick && <Marker position={pick} icon={icon}><Popup>Pickup: {pickup}</Popup></Marker>}
          {drop && <Marker position={drop} icon={icon}><Popup>Dropoff: {dropoff}</Popup></Marker>}
          {line ? (
            <Polyline positions={line as any} />
          ) : (pick && drop ? <Polyline positions={[pick, drop] as any} /> : null)}
        </MapContainer>
      </div>
      <div className="section note">
        Showing ORS route when available; otherwise a straight line between pickup and dropoff.
      </div>
    </div>
  )
}