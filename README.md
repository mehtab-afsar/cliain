# Cliain

AI scheduling for independent clinics. Patients book, reschedule, and get
reminded over WhatsApp — Claude handles the conversation, a voice AI agent
(Vapi) handles reminder calls, and Google Calendar stays in sync. No app for
patients to install, no scheduling software for staff to learn.

## Getting started

1. **Postgres** — needs a running local instance. On macOS:
   `brew services start postgresql@18` (or whichever version you have), then
   `createdb cliain_dev`.
2. **Env vars** — `cp .env.example .env.local` and fill in `DATABASE_URL` and
   `ANTHROPIC_API_KEY` at minimum. WhatsApp/Google Calendar/Vapi vars can stay
   blank until you're ready to wire those up (see below).
3. **Migrate** — `npx prisma migrate dev`
4. **Run** — `npm run dev`

Open [http://localhost:3000](http://localhost:3000) — the landing page. Click
**Get started** to walk through onboarding (writes a real `Doctor` +
`WorkingHours` record to Postgres), which lands you on `/dashboard`. A guided
tour of the dashboard runs automatically on first visit, and again anytime
from the account menu → **Take a tour**.

### Try the AI booking agent without WhatsApp

```bash
curl -X POST localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","message":"Can I see the doctor tomorrow afternoon?"}'
```

### Sanity-check availability logic directly against Postgres, without Claude

```bash
npx tsx --conditions=react-server --env-file=.env.local scripts/check-availability.ts 2026-08-19
```

## How it works

**Onboarding → dashboard.** The onboarding wizard's in-progress state lives in
`localStorage` (a refresh mid-flow doesn't lose progress). The finished draft
is persisted via `POST /api/onboarding` → Prisma. Everything downstream (the
dashboard header, Settings) reads that persisted record server-side — not the
local draft.

**Booking, two ways in, one set of tools.** WhatsApp messages run Claude's
tool-calling loop on our own server. Voice calls are the mirror image: Vapi's
own model drives the live conversation and only calls back to
`/api/webhooks/vapi` to execute a tool — but that tool dispatches to the exact
same implementations WhatsApp uses (`src/features/ai-agent/services/tools/`),
so a booking made by phone follows the same double-booking guard and calendar
sync as one made by text.

**Postgres is the source of truth; Google Calendar is a mirror.** Appointments
are written to Postgres first. Calendar sync is one-way and best-effort — a
Calendar outage never blocks a booking.

**Reminders run themselves.** An in-process `node-cron` job
(`src/instrumentation.ts`) polls every 5 minutes. A text goes out 24 hours
before a visit; a WhatsApp text *and* a Vapi voice call go out 2 hours before.
This requires running as a single process — don't scale the web server to
multiple workers without moving this to a real scheduler first.

## Structure

Feature-folder architecture: `src/app/` holds thin route files only; real
implementation lives in `src/features/<name>/` (components, hooks, services,
types per feature).

| Feature | What it is |
|---|---|
| `landing` | Marketing page |
| `onboarding` | Clinic setup wizard |
| `dashboard-shell` | Sidebar/top-nav chrome around every `/dashboard/*` page |
| `appointments`, `patients`, `calendar`, `settings` | Dashboard pages |
| `product-tour` | Spotlight walkthrough of the dashboard |
| `ai-agent` | No UI — the Claude tool-calling loop, WhatsApp client/webhook, Vapi voice client/webhook |

## What needs real credentials to actually work

- **Anthropic** — set `ANTHROPIC_API_KEY`. Without it, `/api/ai/chat` and the
  WhatsApp webhook return a clear error instead of crashing.
- **WhatsApp Cloud API** — create a Meta App with the WhatsApp product (free
  test number, no business verification needed to start), set
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`.
  Point the webhook at `/api/webhooks/whatsapp` (tunnel with `ngrok`/
  `cloudflared` for local testing).
- **Google Calendar** — create a Google Cloud project, enable the Calendar
  API, create a Service Account, download its JSON key. Set
  `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the JSON) or
  `GOOGLE_SERVICE_ACCOUNT_FILE` (path to the key file). Share a calendar with
  the service account's email, then set that calendar's ID on the `Doctor`
  row (`googleCalendarId` — not yet exposed in onboarding UI; set directly via
  `npx prisma studio` for now).
- **Vapi (voice)** — create an account at vapi.ai, buy/connect a phone number,
  set `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID`. Set `VAPI_TOOL_WEBHOOK_URL`
  to a public URL for `/api/webhooks/vapi` (tunnel locally, same as
  WhatsApp). The exact webhook payload shape was built from Vapi's docs but
  not verified against a live account — if `resolvePatientPhone` in
  `src/app/api/webhooks/vapi/route.ts` can't find the number on a real call,
  temporarily log the raw payload there to see the actual shape.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui (Base UI
primitives), Fraunces + Public Sans + IBM Plex Mono via `next/font`. Backend:
Prisma + PostgreSQL, Anthropic TypeScript SDK, WhatsApp Cloud API, Google
Calendar API, Vapi (voice), `node-cron`.
