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
   `ANTHROPIC_API_KEY` at minimum. Set `DASHBOARD_PASSWORD` and
   `SESSION_SECRET` too if you want to actually reach `/dashboard` (see
   "Dashboard login" below) — WhatsApp/Google Calendar/Vapi vars can stay
   blank until you're ready to wire those up (see below).
3. **Migrate** — `npx prisma migrate dev`
4. **Run** — `npm run dev`

Open [http://localhost:3000](http://localhost:3000) — the landing page. Click
**Get started** to walk through onboarding (writes a real `Doctor` +
`WorkingHours` record to Postgres), which lands you on `/dashboard` — you'll
be asked to sign in first if `DASHBOARD_PASSWORD`/`SESSION_SECRET` are set. A
guided tour of the dashboard runs automatically on first visit, and again
anytime from the account menu → **Take a tour**.

### Dashboard login

`/dashboard/*` and its sensitive APIs (Settings/Integrations, Appointments,
Patients) are gated behind a single shared password — there's no per-user
accounts yet, matching the rest of the app's single-clinic MVP scope. Set
`DASHBOARD_PASSWORD` (whatever you want) and `SESSION_SECRET` (generate with
`openssl rand -base64 32`) in `.env.local`, then sign in at `/login`. Without
both set, `/login` shows a "not configured" message instead of a password
field, and the dashboard stays unreachable. The public landing page and the
onboarding wizard (`/onboarding`) are intentionally left open — see
`src/proxy.ts` for exactly what's gated and why.

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

**Anthropic** is env-var only — set `ANTHROPIC_API_KEY`. Without it,
`/api/ai/chat` and the WhatsApp webhook return a clear error instead of
crashing.

**WhatsApp, Vapi, and Google Calendar** can each be connected two ways:

- **Self-serve, from the dashboard** — `/dashboard/settings` → Integrations.
  Credentials are encrypted (AES-256-GCM) and stored on the `Doctor` row in
  Postgres. Requires `INTEGRATION_ENCRYPTION_KEY` to be set (generate one
  with `openssl rand -base64 32`) — without it, saving a credential from
  Settings fails with a clear error.
- **Env vars**, as before — set the vars below in `.env.local`. These act as
  a fallback: a value saved in Settings always wins over the matching env
  var, so you can mix both (e.g. `ANTHROPIC_API_KEY` in env, WhatsApp
  connected via Settings).

Either way, you'll still need the credentials themselves from each provider:

- **WhatsApp Cloud API** — create a Meta App with the WhatsApp product (free
  test number, no business verification needed to start) to get a phone
  number ID and access token (`WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_ACCESS_TOKEN`), plus a verify token you make up yourself
  (`WHATSAPP_VERIFY_TOKEN`, echoed back by Meta during the webhook handshake).
  Point the webhook at `/api/webhooks/whatsapp` (tunnel with `ngrok`/
  `cloudflared` for local testing).
- **Google Calendar** — create a Google Cloud project, enable the Calendar
  API, create a Service Account, download its JSON key
  (`GOOGLE_SERVICE_ACCOUNT_JSON`, or `GOOGLE_SERVICE_ACCOUNT_FILE` for a file
  path instead — env-var-only, no dashboard equivalent for the file-path
  form). Share a calendar with the service account's email, then set that
  calendar's ID (`googleCalendarId`) — from Settings, or via
  `npx prisma studio`.
- **Vapi (voice)** — create an account at vapi.ai, buy/connect a phone number,
  to get `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID`. `VAPI_TOOL_WEBHOOK_URL`
  needs to be a public URL for `/api/webhooks/vapi` (tunnel locally, same as
  WhatsApp). The exact webhook payload shape was built from Vapi's docs but
  not verified against a live account — if `resolvePatientPhone` in
  `src/app/api/webhooks/vapi/route.ts` can't find the number on a real call,
  temporarily log the raw payload there to see the actual shape.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui (Base UI
primitives), Fraunces + Public Sans + IBM Plex Mono via `next/font`. Backend:
Prisma + PostgreSQL, Anthropic TypeScript SDK, WhatsApp Cloud API, Google
Calendar API, Vapi (voice), `node-cron`.
