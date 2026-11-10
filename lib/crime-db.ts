export function severityFor(type: string): "high" | "medium" | "low" {
  if (type === "Robbery" || type === "Assault") return "high";
  if (type === "Theft" || type === "Burglary") return "medium";
  return "low";
}

export function toCrimeShape(r: {
  id: string;
  type: string;
  area: string;
  latitude: number;
  longitude: number;
  datetime: Date;
  description: string;
  status: string;
}) {
  return {
    id: r.id,
    type: r.type,
    area: r.area,
    latitude: r.latitude,
    longitude: r.longitude,
    datetime: r.datetime instanceof Date ? r.datetime.toISOString() : String(r.datetime),
    description: r.description,
    status: r.status,
    severity: severityFor(r.type),
  };
}
