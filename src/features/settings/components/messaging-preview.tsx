import { ChatPreviewCard } from "@/features/landing/components/chat-preview-card";
import { businessDisplayName, renderGreeting } from "@/features/templates/prompt-render";
import type { TemplateDefinition } from "@/features/templates/types";

/** Renders from the current (last-saved) settings document — the same underlying card used in
 * onboarding, reused here per spec, always with the sample "Anita". Generic over any template:
 * `template.toCommonSettings(settings)` is what projects a template-specific document down to
 * the common shape this preview actually needs, so this component never has to know which
 * template it's rendering for. `settings` is `unknown` because the caller's `TemplateDefinition`
 * is itself Overrides-erased (see registry.ts's doc comment) — the resolved template is the only
 * thing that knows how to interpret it. */
export function MessagingPreview({ template, settings }: { template: TemplateDefinition; settings: unknown }) {
  const commonSettings = template.toCommonSettings(settings);
  const businessName = businessDisplayName(commonSettings);
  const { customerSingular } = template.labels;

  return (
    <div className="flex flex-col items-center gap-3">
      <ChatPreviewCard
        avatarLabel={businessName.trim().charAt(0).toUpperCase() || "C"}
        title={businessName}
        subtitle="via WhatsApp"
        messages={[
          // `from: "patient"` is ChatPreviewCard's internal bubble-side/styling role, not
          // customer-facing prose — it must match its own "patient" | "cliain" union exactly,
          // unrelated to which vertical noun is actually displayed.
          { from: "patient", text: `Hi, is this ${businessName}?` },
          { from: "cliain", text: renderGreeting(commonSettings, template.defaultGreeting) },
        ]}
      />
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        A live preview of what Anita, a sample {customerSingular.toLowerCase()}, would see first.
      </p>
    </div>
  );
}
