"use client";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useEffect, useState } from "react";

export default function PreviewMap() {
  const [crimes, setCrimes] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/crimes?limit=250").then((r) => r.json()).then((d) => setCrimes(d.data ?? [])).catch(() => {});
  }, []);
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl">
      <MapContainer center={[18.52, 73.86]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        {crimes.map((c) => (
          <CircleMarker key={c.id} center={[c.latitude, c.longitude]}
            radius={5}
            pathOptions={{ color: c.severity === "high" ? "#ef4444" : c.severity === "medium" ? "#f59e0b" : "#22c55e", fillOpacity: 0.7, weight: 1 }}>
            <Tooltip>{c.type} • {c.area}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
