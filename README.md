# AI Crime Analytics Platform — Intelligent Crime Prediction & Analytics

Smart Cities (Pune) • ML + AI + Data Analytics • Fully working with real database.

## Quick start

```bash
npm install                       # postinstall runs prisma generate
cp .env.example .env              # then paste your Neon DATABASE_URL into .env
npx prisma db push                # creates all tables in the cloud DB
npm run db:seed                   # seeds 4 users + 650 crimes
npm run dev                       # open http://localhost:3000
```

Accounts (password `demo123` for all):
- Officer: `officer@demo.com` → `/officer`
- Citizens: `citizen@demo.com` (Aarav), `priya@demo.com`, `rahul@demo.com` → `/citizen`
- Or register a new account on `/login` (Officer or Citizen role).

## What is fully working (not demo)

- **Real auth:** scrypt-hashed passwords, `Session` table + httpOnly cookie, role guards
  (citizens get 403 on officer APIs, non-participants 403 on chats).
- **Real database (Prisma + Postgres/Neon):** users, crime reports, evidence, announcements,
  community posts, lost-found, claims, conversations, messages. No in-memory data.
- **Citizen → officer flow:** citizen report creates a real `CrimeReport` visible on the
  officer map + FIR table and shifts area risk scores.
- **Citizen ↔ citizen flow:** claim a blurred lost/found item → owner approves/rejects →
  private conversation opens → live chat (2s polling), all persisted.
- **Officer FIR ingest:** CSV upload validates AND inserts rows into the DB.
- **E2E proof:** `node scripts/e2e-test.mjs` (needs server on :3100) covers claim,
  dup-block, approve, 2-way chat, outsider-block, report persistence — 10/10 green.

## APIs

- `POST /api/auth/register|/login`, `GET|POST /api/auth/session` (logout)
- `GET|POST /api/crimes` (paginated, max 200/page, indexed filters)
- `GET /api/predict/risk?area=` — explainable score:
  freq 40 + recency 25 + severity 20 + night 15, with 7-day forecast
- `POST /api/fir/upload` (officer: validate + insert)
- `GET|POST /api/announcements` (officer-only POST), `/api/evidence`, `/api/alerts`, `/api/lost-found`
- `/api/claims` + `/api/claims/[id]` (approve opens conversation), `/api/chat/conversations|/messages`

## Deploy (GitHub → Vercel, free live link)

The repo is deployed from GitHub; every push auto-redeploys.

1. **Database:** create a free Postgres at [neon.tech](https://neon.tech) and copy the
   connection string (includes `?sslmode=require`).
2. **Seed once** (from your machine): put the URL in `.env`, then
   `npx prisma db push && npm run db:seed`.
3. **Vercel:** go to [vercel.com/new](https://vercel.com/new) → import
   `Anurag42-git/ai-crime-analytics-platform`. Before deploying, add env var
   `DATABASE_URL` = the Neon string (Settings → Environment Variables).
4. Deploy → you get `https://<project>.vercel.app`. Demo accounts still work
   (password `demo123`).

## Production upgrade path

- Polling chat → Socket.io rooms; shared cache → Redis; rule scorer → trained ML
  microservice behind the same `/api/predict/risk` contract.

## Tech

Next.js 14.2.35 + TS + Tailwind + Recharts + Leaflet + Framer Motion + Prisma 5 (Postgres/Neon).
Seed: 650 synthetic Pune crimes (`npm run db:seed` re-creates everything).
