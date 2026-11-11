/**
 * Build real FIR dataset for the platform.
 *
 * Source: Maharashtra Police CCTNS citizen portal (citizen.mahapolice.gov.in →
 * "Search & View Published FIR"), Pune City unit, FIRs registered
 * 01/09/2026 – 29/11/2026 (4,021 FIRs across 45 police stations).
 * Raw scrape: scripts/fir-raw/fir-dump-full.json
 *
 * Transformation:
 *  - Marathi legal sections (BNS 2023, IT Act, MV Act, NDPS, ...) → English crime type
 *  - Police station → area name + real station-anchored coordinates (small deterministic jitter)
 *  - Registration timestamp → ISO datetime
 *
 * Output: lib/data/pune-crimes.json (same Crime[] shape the app already reads).
 * Note: every FIR is REAL (no., station, timestamp, sections). Point coordinates are
 * anchored at the registering police station with jitter — actual spot locations are
 * not published by the portal.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, "fir-raw/fir-dump-full.json"), "utf8"));

// ---------- Police station → area name + coordinates (station-anchored) ----------
const STATIONS: Record<string, { area: string; lat: number; lon: number }> = {
  KONDHVA: { area: "Kondhwa", lat: 18.4636, lon: 73.866 },
  "WAGHOLI POLICE STATION": { area: "Wagholi", lat: 18.6288, lon: 73.9547 },
  VISHRAMBAUG: { area: "Vishrambaug Wada", lat: 18.5162, lon: 73.8556 },
  HADAPSAR: { area: "Hadapsar", lat: 18.5006, lon: 73.9279 },
  "KALEPADAL POLICE STATION": { area: "Kale Padal", lat: 18.479, lon: 73.899 },
  VISHRANTWADI: { area: "Vishrantwadi", lat: 18.5535, lon: 73.8853 },
  "CHANDANNAGAR POLICE STATION": { area: "Chandan Nagar", lat: 18.478, lon: 73.935 },
  FARASKHANA: { area: "Shaniwar Wada", lat: 18.5196, lon: 73.8553 },
  "VIMANTAL (AIRPORT)": { area: "Airport Area", lat: 18.579, lon: 73.91 },
  CHATURSHINGI: { area: "Chaturshringi", lat: 18.536, lon: 73.833 },
  "FURSUNGI POLICE STATION": { area: "Fursungi", lat: 18.546, lon: 73.983 },
  MUNDHAWA: { area: "Mundhwa", lat: 18.567, lon: 73.92 },
  WANVADI: { area: "Wanowrie", lat: 18.479, lon: 73.874 },
  "AMBEGAON POLICE STATION": { area: "Ambegaon", lat: 18.444, lon: 73.857 },
  "KHARADI POLICE STATION": { area: "Kharadi", lat: 18.551, lon: 73.944 },
  LONIKAND: { area: "Lonikand", lat: 18.619, lon: 73.969 },
  "LAXMINAGAR POLICE STATION": { area: "Laxmi Nagar", lat: 18.487, lon: 73.881 },
  "KHADAK  POLICE STATION": { area: "Khadak", lat: 18.5, lon: 73.862 },
  SWARGATE: { area: "Swargate", lat: 18.501, lon: 73.86 },
  "BHARTI VIDYAPEETH": { area: "Bharti Vidyapeeth", lat: 18.462, lon: 73.85 },
  "SAHAKAR NAGAR": { area: "Sahakar Nagar", lat: 18.47, lon: 73.856 },
  "MANJARI POLICE STATION": { area: "Manjari", lat: 18.514, lon: 73.953 },
  "YEWALEWADI POLICE STATION": { area: "Yewalewadi", lat: 18.461, lon: 73.914 },
  KOTHURUD: { area: "Kothrud", lat: 18.507, lon: 73.807 },
  "WARJE MALWADI": { area: "Warje Malwadi", lat: 18.487, lon: 73.805 },
  "LOHGAON POLICE STATION": { area: "Lohgaon", lat: 18.579, lon: 73.928 },
  PARVATI: { area: "Parvati", lat: 18.493, lon: 73.84 },
  BUNDGARDEN: { area: "Bund Garden", lat: 18.532, lon: 73.878 },
  "NARHE POLICE STATION": { area: "Narhe", lat: 18.453, lon: 73.826 },
  "BANER POLICE STATION": { area: "Baner", lat: 18.559, lon: 73.783 },
  LONIKALBHOR: { area: "Lonikalbhor", lat: 18.609, lon: 73.943 },
  "NANEDCITY  POLICE STATION": { area: "Nanded City", lat: 18.461, lon: 73.833 },
  DECCAN: { area: "Deccan Gymkhana", lat: 18.52, lon: 73.839 },
  "BIBVEWADI POLICE STATION": { area: "Bibwewadi", lat: 18.467, lon: 73.867 },
  SAMARTH: { area: "Karve Nagar", lat: 18.49, lon: 73.832 },
  "SINHGAD POLICE STATION": { area: "Sinhagad Road", lat: 18.479, lon: 73.814 },
  YERWADA: { area: "Yerawada", lat: 18.551, lon: 73.883 },
  KHADAKI: { area: "Khadki", lat: 18.564, lon: 73.856 },
  "ALANKAR POLICE STATION": { area: "Gultekdi", lat: 18.478, lon: 73.872 },
  UTTAMNAGAR: { area: "Uttamnagar", lat: 18.467, lon: 73.82 },
  LASHKAR: { area: "Bhavani Peth", lat: 18.516, lon: 73.871 },
  "SHIVAJI NAGAR": { area: "Shivaji Nagar", lat: 18.531, lon: 73.871 },
  MARKETYARD: { area: "Market Yard", lat: 18.483, lon: 73.865 },
  "KOREGAON PARK": { area: "Koregaon Park", lat: 18.536, lon: 73.892 },
  "Pune City Cyber Police Station": { area: "Pune City (Cyber)", lat: 18.53, lon: 73.87 },
};

// ---------- Section text → English crime type + short description ----------
type Class = { type: string; severity: "high" | "medium" | "low" };

function classify(secText: string): Class {
  const s = secText.replace(/\s+/g, " ");
  const has = (re: RegExp) => re.test(s);

  // --- Special acts first (they dominate when present alone) ---
  if (has(/माहिती तंत्रज्ञान/)) return { type: "Cybercrime", severity: "medium" };
  if (has(/गुंगीकारक औषधीदव्/)) return { type: "Drug Offence", severity: "high" };
  if (has(/दारूबंदी/)) return { type: "Liquor Offence", severity: "low" };
  if (has(/जुगार/)) return { type: "Gambling", severity: "low" };
  if (has(/शस्‍त्र अधिनियम/)) return { type: "Arms Violation", severity: "high" };
  // (Criminal Law Amendment Act 2013 is neutral — classify by accompanying BNS sections below)

  // --- BNS 2023 (भारतीय न्याय संहिता) — grab the ASCII section list ---
  const bnsMatch = s.match(/बी एन एस\)?,? ?2023 ?- ([^;]+)/);
  const bns = bnsMatch ? bnsMatch[1] : "";
  const secs = bns.split(",").map((x) => x.trim());
  const top = (num: string) => secs.some((x) => x === num || x.startsWith(num + "("));

  if (top("103") || top("105")) return { type: "Murder", severity: "high" };
  if (top("109")) return { type: "Attempt to Murder", severity: "high" };
  if (top("63") || top("64") || top("65") || top("66") || top("67") || top("68") || top("69") || top("70") || top("71") || top("72") || top("73") || top("74") || top("75") || top("76") || top("77"))
    return { type: "Sexual Offence", severity: "high" };
  if (has(/पोक्सो/)) return { type: "Sexual Offence", severity: "high" };
  if (top("309") || top("310") || top("311")) return { type: "Robbery", severity: "high" };
  if (top("308")) return { type: "Extortion", severity: "high" };
  if (top("137") || top("140")) return { type: "Kidnapping", severity: "high" };
  if (top("106") && has(/मोटरवाहन|मोटार वाहन/)) return { type: "Road Accident", severity: "medium" };
  if (top("117")) return { type: "Assault", severity: "high" }; // grievous hurt
  if (top("74") || top("75") || top("76") || top("77") || top("78") || top("79"))
    return { type: "Assault on Woman", severity: "high" }; // outraging modesty, stalking etc.
  if (top("85") || top("80")) return { type: "Domestic Violence", severity: "high" };
  if (top("302") || top("304")) return { type: "Snatching", severity: "medium" };
  if (top("303") || top("305")) return { type: "Theft", severity: "medium" };
  if (top("329") || top("331") || top("333")) return { type: "Burglary", severity: "medium" };
  if (top("318") || top("319") || top("316")) return { type: "Cheating/Fraud", severity: "medium" };
  if (top("189") || top("191")) return { type: "Rioting", severity: "medium" };
  if (top("351")) return { type: "Threat/Intimidation", severity: "medium" };
  if (top("115") || top("118") || top("119") || top("125") || top("131")) return { type: "Assault", severity: "medium" };
  if (top("324") || top("325") || top("326")) return { type: "Mischief", severity: "low" };
  if (top("106")) return { type: "Road Accident", severity: "medium" };
  if (top("223") || top("270") || top("126") || top("127")) return { type: "Public Order", severity: "low" };
  if (top("352")) return { type: "Threat/Intimidation", severity: "low" };
  if (has(/मोटरवाहन अधिनियम|मोटार वाहन नियम/)) return { type: "Traffic Violation", severity: "low" };
  if (top("281")) return { type: "Traffic Violation", severity: "medium" };
  if (bns) return { type: "Other", severity: "low" };
  if (has(/महाराष्ट्र पोलीस अधिनियम/)) return { type: "Public Order", severity: "low" };
  return { type: "Other", severity: "low" };
}

// ---------- Short English section summary for descriptions ----------
const ACT_MAP: Array<[RegExp, string]> = [
  [/भारतीय न्याय संहिता[^-]*- ([^;]+)/, "BNS $1"],
  [/माहिती तंत्रज्ञान अधिनियम[^-]*- ([^;]+)/, "IT Act $1"],
  [/मोटरवाहन अधिनियम[^-]*- ([^;]+)/, "MV Act $1"],
  [/महाराष्ट्र मोटार वाहन नियम[^-]*- ([^;]+)/, "MMVR $1"],
  [/गुंगीकारक[^-]*- ([^;]+)/, "NDPS $1"],
  [/दारूबंदी[^-]*- ([^;]+)/, "Prohibition Act $1"],
  [/जुगार[^-]*- ([^;]+)/, "Gambling Act $1"],
  [/शस्‍त्र अधिनियम[^-]*- ([^;]+)/, "Arms Act $1"],
  [/पोलीस अधिनियम[^-]*- ([^;]+)/, "Police Act $1"],
  [/फौजदारी कायदा \(सुधारणा\)[^-]*- ([^;]+)/, "Cr.L.Amendment $1"],
];

function summarize(secText: string): string {
  const parts: string[] = [];
  for (const [re, out] of ACT_MAP) {
    const m = secText.match(re);
    if (m) parts.push(out.replace("$1", m[1].trim()));
  }
  return parts.join("; ") || "sections as per FIR";
}

// ---------- Deterministic jitter from FIR number ----------
function jitter(fir: string): [number, number] {
  let h = 0;
  for (let i = 0; i < fir.length; i++) h = (h * 31 + fir.charCodeAt(i)) | 0;
  const a = ((h & 0xff) / 128 - 1) * 0.0035;
  const b = (((h >> 8) & 0xff) / 128 - 1) * 0.0035;
  return [a, b];
}

function parseDate(dt: string): string {
  // "DD/MM/YYYY HH:MM:SS"
  const m = dt.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return new Date().toISOString();
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).toISOString();
}

// ---------- Build ----------
const out: any[] = [];
let idx = 0;
for (const key of Object.keys(raw.pages).sort((a, b) => (+a.slice(1)) - (+b.slice(1)))) {
  const page = raw.pages[key];
  for (const [stId, dt, fir, secId] of page) {
    const stationName = Object.entries(raw.stations).find(([, id]) => id === stId)![0];
    const st = STATIONS[stationName];
    if (!st) { console.error("UNKNOWN STATION:", stationName); continue; }
    const secText = Object.entries(raw.secs).find(([, id]) => id === secId)![0];
    const cls = classify(secText);
    const [dy, dx] = jitter(fir);
    idx++;
    out.push({
      id: `CR-${String(idx).padStart(4, "0")}`,
      type: cls.type,
      area: st.area,
      latitude: +(st.lat + dy).toFixed(6),
      longitude: +(st.lon + dx).toFixed(6),
      datetime: parseDate(dt),
      description: `Real FIR ${fir} registered at ${stationName} police station (${summarize(secText)}). Source: CCTNS Maharashtra Police published FIR portal.`,
      status: "Under Investigation",
      severity: cls.severity,
      station: stationName,
      fir: fir,
    });
  }
}

const counts: Record<string, number> = {};
for (const c of out) counts[c.type] = (counts[c.type] || 0) + 1;

const final = out.map(({ station, fir, ...rest }) => rest);
writeFileSync(
  join(here, "../lib/data/pune-crimes.json"),
  JSON.stringify(final, null, 1)
);

console.log("Records:", final.length);
console.log("Areas:", new Set(final.map((c) => c.area)).size);
console.log("Types:", JSON.stringify(
  Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}: ${n}`),
  null, 1
));
