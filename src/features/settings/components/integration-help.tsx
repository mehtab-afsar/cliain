import { ExternalLink } from "lucide-react";

type HelpLink = { label: string; href: string };

type IntegrationHelpProps = {
  steps: string[];
  links: HelpLink[];
};

/** A concrete "where do I get this value" walkthrough, shown directly on the integration card
 *  rather than hidden behind a tooltip — these are third-party dashboards nobody has open by
 *  default, so a field label alone ("App secret", "Phone number ID") isn't enough to act on. */
export function IntegrationHelp({ steps, links }: IntegrationHelpProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3.5">
      <ol className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-border text-[10px] font-medium text-foreground">
              {index + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2.5">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const WHATSAPP_HELP: IntegrationHelpProps = {
  steps: [
    "Create a Meta App at developers.facebook.com and add the \"WhatsApp\" product to it.",
    "WhatsApp → API Setup shows a test number — copy its Phone number ID into the field below.",
    "The token shown there expires in 24 hours. For a real clinic, generate a permanent one instead: Business Settings → System Users → create one → assign it your app with \"whatsapp_business_messaging\" permission → Generate token. Paste that as the Access token.",
    "App secret: your App's dashboard → Settings → Basic → App Secret (click Show).",
    "Webhook verify token: make up any string yourself — you'll paste this same value into Meta's webhook config in the next step.",
    "Save this card first, then open \"Advanced\" below, copy the Webhook URL, and paste it into WhatsApp → Configuration → Webhook in your Meta App, using the verify token from step 5. Subscribe to the \"messages\" field.",
  ],
  links: [
    { label: "Meta for Developers", href: "https://developers.facebook.com/" },
    { label: "WhatsApp Cloud API docs", href: "https://developers.facebook.com/docs/whatsapp/cloud-api" },
  ],
};

// No GOOGLE_CALENDAR_HELP — connecting is a "Connect with Google" button (see
// GoogleCalendarStatusCard), not a form a clinic fills in, so there's nothing to walk through.
