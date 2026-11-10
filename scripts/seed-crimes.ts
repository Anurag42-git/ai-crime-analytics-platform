import fs from "fs";
import path from "path";

// Pune areas with approx lat/lng
const AREAS = [
  { name: "Shivajinagar", lat: 18.5314, lng: 73.8446 },
  { name: "Kothrud", lat: 18.5074, lng: 73.8077 },
  { name: "Hadapsar", lat: 18.5089, lng: 73.926 },
  { name: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
  { name: "Baner", lat: 18.559, lng: 73.7868 },
  { name: "Wakad", lat: 18.5986, lng: 73.7641 },
  { name: "Katraj", lat: 18.4574, lng: 73.8671 },
  { name: "Pimpri", lat: 18.6298, lng: 73.7997 },
  { name: "Chinchwad", lat: 18.6293, lng: 73.7992 },
  { name: "Koregaon Park", lat: 18.5362, lng: 73.8939 },
  { name: "Magarpatta", lat: 18.5196, lng: 73.9343 },
  { name: "Yerwada", lat: 18.55, lng: 73.8788 },
  { name: "Swargate", lat: 18.5018, lng: 73.8636 },
  { name: "Deccan", lat: 18.5158, lng: 73.8412 },
  { name: "Aundh", lat: 18.5582, lng: 73.8077 },
];

const TYPES = [
  "Theft",
  "Chain Snatching",
  "Burglary",
  "Assault",
  "Fraud",
  "Harassment",
  "Vandalism",
  "Pickpocket",
  "Robbery",
  "Cybercrime",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const out: any[] = [];
const now = new Date();
let id = 1;
for (let i = 0; i < 650; i++) {
  const area = pick(AREAS);
  const type = pick(TYPES);
  const daysAgo = rand(0, 180);
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rand(0, 23), rand(0, 59), 0, 0);
  out.push({
    id: `CR-${String(id++).padStart(4, "0")}`,
    type,
    area: area.name,
    latitude: area.lat + (Math.random() - 0.5) * 0.03,
    longitude: area.lng + (Math.random() - 0.5) * 0.03,
    datetime: d.toISOString(),
    description: `${type} reported near ${area.name}, Pune.`,
    status: pick(["Open", "Investigating", "Closed", "Investigating", "Closed"]),
    severity: type === "Robbery" || type === "Assault" ? "high" : type === "Theft" || type === "Burglary" ? "medium" : "low",
  });
}

const dir = path.join(process.cwd(), "lib", "data");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "pune-crimes.json"), JSON.stringify(out, null, 2));
console.log(`Seeded ${out.length} crimes -> lib/data/pune-crimes.json`);
