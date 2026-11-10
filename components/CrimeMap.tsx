"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

export default function CrimeMap({ crimes, onSelect }: { crimes: any[]; onSelect?: (area: string) => void }) {
  return (
    <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-white/10">
      <MapContainer center={[18.52, 73.86]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        {crimes.slice(0, 400).map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude, c.longitude]}
            radius={c.severity === "high" ? 8 : 5}
            pathOptions={{
              color: c.severity === "high" ? "#ef4444" : c.severity === "medium" ? "#f59e0b" : "#22c55e",
              fillOpacity: 0.75,
              weight: 1,
            }}
            eventHandlers={{ click: () => onSelect?.(c.area) }}
          >
            <Popup>
              <div className="text-xs text-slate-900">
                <b>{c.type}</b> • {c.area}<br />{c.id} • {c.status}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
