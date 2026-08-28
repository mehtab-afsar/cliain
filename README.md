# Cliain

AI scheduling for independent clinics. Patients book, reschedule, and get
reminded over WhatsApp — Claude handles the conversation, a voice AI agent
(Vapi) handles reminder calls, and Google Calendar stays in sync. No app for
patients to install, no scheduling software for staff to learn.

Multi-tenant: one deployment serves many clinics. Each clinic connects its
own WhatsApp/Vapi/Calendar credentials and gets its own webhook URLs — there
is no shared fallback credential, so one clinic's connection never leaks to
another's.

## Getting started

1. **Postgres** — needs a running local instance. On macOS:
   `brew services start postgresql@18` (or whichever version you have), then
   `createdb cliain_dev`.
2. **Env vars** — `cp .env.example .env.local` and fill in `DATABASE_URL`,
   `ANTHROPIC_API_KEY`, and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/
   `AUTH_SECRET` (see "Signing in" below) at minimum. WhatsApp/Vapi/Google
   Calendar are connected per-clinic later, from the dashboard.
3. **Migrate** — `npx prisma migrate deploy`
4. **Run** — `npm run dev`

Open [http://localhost:3000](http://localhost:3000) — the landing page. Click
**Get started**, sign in with Google, and walk through onboarding (creates a
`Doctor` + an `owner` `Membership` for your account). That lands you on
`/dashboard`. A guided tour of the dashboard runs automatically on first
visit, and again anytime from the account menu → **Take a tour**.

### Signing in

There's no password login — the only way in is **Sign in with Google**
(Auth.js/NextAuth). Create an OAuth client in Google Cloud Console (type
"Web application"), authorized redirect URI `<origin>/api/auth/callback/google`
for each environment you run (localhost + deployed), and set
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Generate `AUTH_SECRET` with
`openssl rand -base64 32`. Without these three set, the login button will
error when clicked — there's no "not configured" fallback screen.

`/dashboard/*` and its data APIs (Settings, Appointments, Patients) require a
signed-in session with a clinic `Membership`; the public landing page and the
onboarding wizard are left open. See `src/proxy.ts` for exactly what's gated.

**One clinic per user, for now.** A signed-in user either creates a clinic
through onboarding or joins one via an invite link — `invitation-service.ts`
explicitly blocks accepting a second invite while you already belong to one
clinic. Team members get invited from Settings (owner-only) and land on
`/invite/[token]`.

### Try the AI booking agent without WhatsApp

Grab a `doctorId` from Settings → Integrations (or `npx prisma studio`),
then:

```bash
curl -X POST localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"...","phone":"+15551234567","message":"Can I see the doctor tomorrow afternoon?"}'
```

### Sanity-check availability logic directly against Postgres, without Claude

```bash
npx tsx --conditions=react-server --env-file=.env.local scripts/check-availability.ts <doctorId> 2026-08-19
```

## How it works

**Onboarding → dashboard.** The onboarding wizard's in-progress state lives in
`localStorage` (a refresh mid-flow doesn't lose progress). The finished draft
is persisted via `POST /api/onboarding` → Prisma, creating (or updating) the
signed-in user's `Doctor` + `Membership`.

**Booking, two ways in, one set of tools.** WhatsApp messages run Claude's
tool-calling loop on our own server. Voice calls are the mirror image: Vapi's
own model drives the live conversation and only calls back to
`/api/webhooks/vapi/<doctorId>` to execute a tool — but that tool dispatches
to the exact same implementations WhatsApp uses
(`src/features/ai-agent/services/tools/`), so a booking made by phone follows
the same double-booking guard and calendar sync as one made by text. The
`doctorId` in both webhook URLs *is* the tenant key — there's no ambiguous
lookup, so it doesn't matter how many clinics are connected.

**Postgres is the source of truth; Google Calendar is a mirror.** Appointments
are written to Postgres first. Calendar sync is one-way and best-effort — a
Calendar outage never blocks a booking.

**Reminders run themselves.** An in-process `node-cron` job
(`src/instrumentation.ts`) polls every 5 minutes, across every clinic. A text
goes out 24 hours before a visit; a WhatsApp text *and* a Vapi voice call go
out 2 hours before. This requires running as a single process — don't scale
the web server to multiple workers without moving this to a real scheduler
first (see `CRON_SECRET` below for the alternative).

## Structure

Feature-folder architecture: `src/app/` holds thin route files only; real
implementation lives in `src/features/<name>/` (components, hooks, services,
types per feature).

| Feature | What it is |
|---|---|
| `landing` | Marketing page |
| `login` | Google sign-in |
| `invitations` | Team invite links, join flow |
| `onboarding` | Clinic setup wizard |
| `dashboard-shell` | Sidebar/top-nav chrome around every `/dashboard/*` page |
| `appointments`, `patients`, `calendar`, `settings` | Dashboard pages |
| `product-tour` | Spotlight walkthrough of the dashboard |
| `ai-agent` | No UI — the Claude tool-calling loop, WhatsApp client/webhook, Vapi voice client/webhook |

## Connecting a clinic's WhatsApp, Vapi, and Google Calendar

All three are connected **per clinic**, entirely from `/dashboard/settings` →
Integrations — there's no env var fallback, so a clinic with nothing
connected simply can't send/receive on that channel yet (no risk of silently
borrowing another clinic's credentials).

- **WhatsApp Cloud API** — create a Meta App with the WhatsApp product (free
  test number, no business verification needed to start) to get a phone
  number ID and access token. Settings shows you this clinic's exact webhook
  URL (`/api/webhooks/whatsapp/<doctorId>`) to paste into that Meta App —
  tunnel it publicly first (`ngrok`/`cloudflared`) if you're testing locally.
  You also pick a **verify token** yourself (any string — Meta echoes it back
  during the webhook handshake) and, recommended, paste in the Meta App's
  **App Secret** so inbound deliveries get signature-verified
  (`X-Hub-Signature-256`) instead of trusted blindly.
- **Vapi (voice)** — create an account at vapi.ai, buy/connect a phone
  number, get an API key and phone number ID. This clinic's tool webhook URL
  (`/api/webhooks/vapi/<doctorId>`) is computed automatically from `APP_URL` —
  set that as the assistant's server URL in Vapi. Recommended: set a
  **webhook secret** in Settings and the matching `server.secret` on the Vapi
  side, so tool-call requests get verified too. The exact webhook payload
  shape was built from Vapi's docs but not verified against a live account —
  if `resolvePatientPhone` in `src/app/api/webhooks/vapi/[doctorId]/route.ts`
  can't find the caller's number, temporarily log the raw payload to see the
  actual shape.
- **Google Calendar** — create a Google Cloud project, enable the Calendar
  API, create a Service Account, download its JSON key, paste it into
  Settings along with the calendar ID to sync to. Share that calendar with
  the service account's email first.

## Other env vars

- **`APP_URL`** — this deployment's public base URL (no trailing slash). Used
  to build every clinic's Vapi webhook URL. In dev, this is your tunnel URL.
- **`CRON_SECRET`** — only needed if triggering `/api/cron/reminders` from an
  external scheduler (e.g. Vercel Cron) instead of the in-process one. The
  endpoint refuses every request when this isn't set (fails closed), and
  expects `Authorization: Bearer <CRON_SECRET>`.
- **`INTEGRATION_ENCRYPTION_KEY`** — AES-256-GCM key encrypting every
  clinic's WhatsApp/Vapi/Calendar secrets at rest. Generate with
  `openssl rand -base64 32`.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui (Base UI
primitives), Fraunces + Public Sans + IBM Plex Mono via `next/font`. Backend:
Prisma + PostgreSQL, Auth.js (Google), Anthropic TypeScript SDK, WhatsApp
Cloud API, Google Calendar API, Vapi (voice), `node-cron`.
