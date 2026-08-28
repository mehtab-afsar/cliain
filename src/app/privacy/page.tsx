import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy — Cliain" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 28, 2026">
      <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <strong>Draft — not legal advice.</strong> This page is a starting point, not a
        substitute for review by a lawyer. Have it reviewed before relying on it with real
        patients beyond a limited pilot.
      </p>

      <div>
        <h2>Who this covers</h2>
        <p>
          Cliain provides an AI receptionist that a clinic connects to its own WhatsApp number
          and phone line. The clinic you&apos;re messaging or calling is the one responsible for
          your care and for how your information is used — Cliain processes it on the
          clinic&apos;s behalf, as a service provider, not as an independent party deciding what
          to do with your data.
        </p>
      </div>

      <div>
        <h2>What we collect</h2>
        <ul>
          <li>Your name and phone number, when you message or call a connected clinic.</li>
          <li>The reason you gave for an appointment, if you shared one.</li>
          <li>Appointment times, booking history, and message/call transcripts with the AI.</li>
        </ul>
      </div>

      <div>
        <h2>Why we collect it</h2>
        <p>
          Solely to operate the booking service on the clinic&apos;s behalf: finding you an
          appointment, confirming it, sending reminders, and letting clinic staff see your
          upcoming visits in their dashboard.
        </p>
      </div>

      <div>
        <h2>Who it&apos;s shared with</h2>
        <ul>
          <li>The clinic you contacted — they can see your messages and appointments.</li>
          <li>Anthropic, to process your message and generate a response.</li>
          <li>Meta (WhatsApp) or Vapi, to deliver the message or call.</li>
          <li>
            Google Calendar, only if the clinic has connected their calendar — your appointment
            is mirrored there.
          </li>
        </ul>
        <p>We don&apos;t sell your information, and we don&apos;t share it with anyone else.</p>
      </div>

      <div>
        <h2>How long we keep it</h2>
        <p>
          For as long as the clinic keeps using Cliain, so they retain an accurate patient and
          appointment history. If a clinic stops using Cliain, its data is deleted within a
          reasonable period afterward.
        </p>
      </div>

      <div>
        <h2>Questions</h2>
        <p>
          For a question about your own data, contact the clinic you booked with directly —
          they control it. For a question about Cliain itself, reach us at the contact
          information the clinic that referred you can provide.
        </p>
      </div>
    </LegalPage>
  );
}
