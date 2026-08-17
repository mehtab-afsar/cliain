import type { ReactNode } from "react";

export type ChatMessage = {
  from: "patient" | "cliain";
  text: string;
};

type ChatPreviewCardProps = {
  avatarLabel: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  messages: ChatMessage[];
  footer?: ReactNode;
};

export function ChatPreviewCard({
  avatarLabel,
  title,
  subtitle,
  badge,
  messages,
  footer,
}: ChatPreviewCardProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(31,42,40,0.04),0_4px_12px_rgba(31,42,40,0.06)]">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading text-sm">
            {avatarLabel}
          </span>
          <div>
            <p className="max-w-[10rem] truncate text-sm font-medium text-foreground">
              {title}
            </p>
            {subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {badge}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.from === "cliain"
                ? "self-start rounded-xl rounded-bl-sm bg-secondary px-3.5 py-2.5 text-sm text-foreground"
                : "self-end rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
            }
          >
            {message.text}
          </div>
        ))}
      </div>

      {footer}
    </div>
  );
}
