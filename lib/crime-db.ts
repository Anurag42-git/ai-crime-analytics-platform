export function severityFor(type: string): "high" | "medium" | "low" {
  // Matches the real CCTNS crime categories produced by scripts/build-real-data.ts
  if (
    type === "Murder" ||
    type === "Attempt to Murder" ||
    type === "Robbery" ||
    type === "Sexual Offence" ||
    type === "Assault on Woman" ||
    type === "Kidnapping" ||
    type === "Arms Violation" ||
    type === "Drug Offence" ||
    type === "Domestic Violence" ||
    type === "Extortion"
  )
    return "high";
  if (
    type === "Assault" ||
    type === "Theft" ||
    type === "Burglary" ||
    type === "Snatching" ||
    type === "Cheating/Fraud" ||
    type === "Cybercrime" ||
    type === "Threat/Intimidation" ||
    type === "Rioting" ||
    type === "Road Accident" ||
    type === "Chain Snatching" ||
    type === "Harassment" ||
    type === "Fraud"
  )
    return "medium";
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
