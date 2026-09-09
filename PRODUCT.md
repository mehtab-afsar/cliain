# Cliain

**AI reception for independent clinics.** Patients text or call, an AI agent handles the conversation, and every booking lands on the clinic's calendar automatically — no app for patients to install, no scheduling software for staff to learn.

---

## The problem

A small clinic's front desk is the bottleneck of the whole operation. Every call not picked up is a patient who might not call back. Every WhatsApp message that sits unanswered for an hour is a missed booking. Reminder calls, rescheduling requests, "are you open Saturday?" — all of it competes with in-person patients for the same one or two staff members, and none of it happens after 6pm or on a lunch break.

Off-the-shelf scheduling software doesn't fix this — it just moves the problem from a phone to a web form the patient still has to find, open, and fill in themselves. Most patients never do.

## The solution

Cliain sits on top of the channels a clinic's patients already use — WhatsApp and phone calls — and answers as if it were clinic staff: checking real availability, booking the visit, confirming it, and following up, all without a human in the loop. Nothing new for the patient to install. Nothing new for the clinic to operate day-to-day beyond a dashboard for oversight.

## How it works

1. **A patient reaches out** — a WhatsApp message or a phone call to the clinic's real number.
2. **The AI checks real availability** — the clinic's actual working hours cross-referenced against existing bookings, never a guess.
3. **The booking is confirmed instantly** — written to the clinic's records the moment a time is picked, and mirrored to Google Calendar if the clinic has one connected.
4. **Reminders send themselves** — a text 24 hours ahead, and a text plus a voice call 2 hours ahead, so no-shows drop without anyone lifting a finger.

Text and voice are two entry points into the exact same booking logic — a phone call and a WhatsApp message go through the same double-booking guard, the same calendar sync, the same patient record. A patient can start a conversation by text and finish it by call, or vice versa, and the clinic sees one consistent history either way.

## Who it's for

Independent, single- or few-location clinics and medical practices — the kind of business where the person answering the phone is also often mid-appointment with someone else, and where a missed call has a real cost (a lost patient, not just a lost lead). Built for a clinic owner or office manager to set up themselves in about five minutes, without needing IT support or a procurement process.

## Core features

- **WhatsApp reception** — patients message the clinic's own WhatsApp number; the AI answers, checks availability, and books, all inside that conversation.
- **Voice reception** — patients call the clinic's own phone number; an AI voice agent has the same conversation out loud, with access to the same booking tools.
- **Automatic reminders** — a WhatsApp text 24 hours before a visit, and a text plus a phone call 2 hours before, to cut down no-shows without staff having to place a single call.
- **Google Calendar sync** — every booking mirrors to a calendar the clinic already uses, one-way and best-effort, so a calendar hiccup never blocks a booking from going through.
- **A real dashboard** — appointments, patients, and clinic settings in one place, so staff always have a clear picture even though most bookings never touch a human.
- **Guided onboarding** — a four-step wizard (clinic details, doctor/provider profile, working hours, review) that gets a clinic from signup to a live, bookable AI receptionist in one sitting.
- **Multi-tenant by design** — one deployment serves many clinics, and each clinic connects its own WhatsApp/Calendar credentials. There is no shared fallback credential between clinics for those, and no clinic can see or affect another's data, bookings, or integrations. Phone calls are the one exception, by design: they run on Cliain's own hosted Vapi account, so a clinic just switches it on rather than holding a credential.
- **Team access** — a clinic owner can invite staff via a link; each clinic supports multiple team members with role-based access.

## What makes it different

- **No app, no portal, no new habit.** Patients use the WhatsApp thread or phone number they already have for the clinic. There's nothing to download and nothing to learn.
- **Real availability, not a static form.** The AI is checking the clinic's actual calendar in real time, not offering slots from a form a receptionist filled in last week.
- **Text and voice, unified.** Most "AI receptionist" products pick one channel. Cliain treats a phone call and a WhatsApp message as two doors into the same room — same tools, same guarantees, same patient record.
- **Built clinic-first, not generic.** Onboarding, terminology, and the AI's conversational tone are shaped around how a clinic actually runs (doctors, working hours, appointment reasons) rather than a one-size-fits-all booking widget.

## Trust & data handling

- Every clinic's WhatsApp and Google Calendar credentials are encrypted at rest (AES-256-GCM) and never shared across clinics — there is no fallback credential that could leak one clinic's access to another. Phone calls run on Cliain's own hosted Vapi account instead of a per-clinic credential; each clinic still gets its own generated (encrypted) webhook secret so one clinic's calls can't be spoofed as another's.
- Patient conversations are processed by Anthropic's Claude to power the booking agent, and are only ever used to operate the booking service on the clinic's behalf.
- A double-booking is prevented at the database level (a serializable transaction backs every booking and reschedule), not just checked in application code — verified under real concurrent load, not assumed.
- Webhook traffic from WhatsApp and Vapi is signature-verified and rate-limited; a malformed or malicious request degrades gracefully instead of crashing a live conversation.
- A privacy policy and terms of service are published (`/privacy`, `/terms`) and linked from every page — currently a draft pending a legal review before scaling past a pilot clinic.

## Current status

The core product — WhatsApp booking, voice booking, calendar sync, reminders, onboarding, and the staff dashboard — is built and functionally complete, and has been hardened for a real clinic launch: webhook error isolation so a bad request can't kill a live phone call, required signature verification on both integrations, rate limiting, error monitoring, and an automated test suite covering the booking logic that must never fail (the double-booking guard).

Outstanding before a wider rollout: the Vapi voice payload shape, and the new self-serve phone number provisioning (a clinic clicking "Enable phone calls" in Settings), haven't yet been confirmed against one real live account and a real inbound call — and the privacy policy/terms draft hasn't had a lawyer's review. Billing/payments aren't built yet — the product is currently free to run, and phone calls specifically are a real cost Cliain absorbs per clinic (its own Vapi account, not passed through), which needs pricing before this scales past a handful of clinics.

## Roadmap

- **Beyond clinics.** The booking/reminder engine underneath Cliain isn't inherently medical — the same mechanics (real availability, text or call, automatic reminders) apply to gyms, salons, and other appointment-based small businesses. The plan is a `businessType` setting that reshapes onboarding copy and the AI's vocabulary per vertical, without rebuilding the underlying product.
- **Billing.** Not yet started; the product currently has no payment/subscription layer.
- **Deeper analytics.** The dashboard currently shows appointments and patients; a clinic-facing view of response times, booking conversion, and no-show rates is a natural next step.

---

*Cliain — the front desk that never clocks out.*
