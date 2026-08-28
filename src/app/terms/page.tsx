import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Service — Cliain" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 28, 2026">
      <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <strong>Draft — not legal advice.</strong> This page is a starting point, not a
        substitute for review by a lawyer. Have it reviewed before relying on it with real
        clinics and patients beyond a limited pilot.
      </p>

      <div>
        <h2>What Cliain is</h2>
        <p>
          Cliain is a booking and reception tool a clinic connects to its own WhatsApp number
          and phone line, so patients can book, reschedule, and get reminded automatically. A
          clinic that signs up is responsible for the accuracy of the information it provides
          (working hours, staff details) and for how it uses the dashboard.
        </p>
      </div>

      <div>
        <h2>The clinic&apos;s responsibilities</h2>
        <ul>
          <li>Only connecting WhatsApp/voice numbers you&apos;re authorized to use.</li>
          <li>
            Being the point of contact for your own patients&apos; questions about their data —
            Cliain processes it on your behalf, but you remain responsible for your patients.
          </li>
          <li>Not using Cliain for anything unlawful or for a purpose it wasn&apos;t built for.</li>
        </ul>
      </div>

      <div>
        <h2>No guarantee of uptime or accuracy</h2>
        <p>
          Cliain is provided during an early pilot phase. While every booking is checked against
          real availability before being offered, the service is provided &quot;as is,&quot;
          without a guarantee against downtime, a missed message, or an AI response that
          isn&apos;t exactly what you&apos;d have said yourself.
        </p>
      </div>

      <div>
        <h2>Changes</h2>
        <p>
          These terms may change as the product develops. Continuing to use Cliain after a
          change means you accept the updated terms.
        </p>
      </div>

      <div>
        <h2>Contact</h2>
        <p>Questions about these terms can be directed to whoever set up your Cliain account.</p>
      </div>
    </LegalPage>
  );
}
