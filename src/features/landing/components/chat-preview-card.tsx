"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCheck } from "lucide-react";

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

const TIMESTAMPS = ["10:12 AM", "10:12 AM", "10:14 AM", "10:14 AM", "10:15 AM", "10:15 AM"];
const TYPE_DELAY = 900;
const MESSAGE_GAP = 850;
const LOOP_PAUSE = 2600;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

function TypingBubble({ from }: { from: ChatMessage["from"] }) {
  const isPatient = from === "patient";
  return (
    <div
      className={
        isPatient
          ? "flex max-w-[85%] items-center gap-1 self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3 shadow-sm motion-safe:animate-in motion-safe:fade-in-0"
          : "flex max-w-[85%] items-center gap-1 self-start rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm motion-safe:animate-in motion-safe:fade-in-0"
      }
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={
            isPatient
              ? "h-1.5 w-1.5 rounded-full bg-primary-foreground/70 motion-safe:animate-bounce"
              : "h-1.5 w-1.5 rounded-full bg-muted-foreground/70 motion-safe:animate-bounce"
          }
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatPreviewCard({
  avatarLabel,
  title,
  subtitle,
  badge,
  messages,
  footer,
}: ChatPreviewCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const messagesKey = messages.map((message) => message.text).join("|");

  const [visibleCount, setVisibleCount] = useState(0);
  const [typingFrom, setTypingFrom] = useState<ChatMessage["from"] | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timeouts.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, delay),
      );
    };

    function playFrom(index: number, elapsed: number) {
      if (index >= messages.length) {
        schedule(() => {
          setVisibleCount(0);
          setTypingFrom(null);
          playFrom(0, 0);
        }, elapsed + LOOP_PAUSE);
        return;
      }

      const message = messages[index];
      const typingTime = message.from === "cliain" ? TYPE_DELAY : 500;

      schedule(() => setTypingFrom(message.from), elapsed);
      schedule(() => {
        setTypingFrom(null);
        setVisibleCount(index + 1);
      }, elapsed + typingTime);

      playFrom(index + 1, elapsed + typingTime + MESSAGE_GAP);
    }

    schedule(() => {
      setVisibleCount(0);
      setTypingFrom(null);
      playFrom(0, 400);
    }, 0);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesKey, reducedMotion]);

  const visibleMessages = messages.slice(0, reducedMotion ? messages.length : visibleCount);
  const activeTypingFrom = reducedMotion ? null : typingFrom;

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-sm">
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3.5 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground font-heading text-sm text-primary">
            {avatarLabel}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            {subtitle ? (
              <p className="truncate text-xs text-primary-foreground/70">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {badge}
      </div>

      <div
        className="flex min-h-[240px] flex-col gap-3 px-4 py-5"
        style={{
          backgroundImage: "radial-gradient(rgba(31, 42, 40, 0.08) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundColor: "var(--secondary)",
        }}
      >
        {visibleMessages.map((message, index) => {
          const isPatient = message.from === "patient";
          return (
            <div
              key={index}
              className={
                isPatient
                  ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                  : "max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
              }
            >
              <p
                className={
                  isPatient
                    ? "text-sm leading-snug text-primary-foreground"
                    : "text-sm leading-snug text-foreground"
                }
              >
                {message.text}
              </p>
              <p
                className={
                  isPatient
                    ? "mt-1 flex items-center justify-end gap-1 text-[0.65rem] text-primary-foreground/70"
                    : "mt-1 text-right text-[0.65rem] text-muted-foreground"
                }
              >
                {TIMESTAMPS[index % TIMESTAMPS.length]}
                {isPatient ? <CheckCheck className="h-3 w-3" /> : null}
              </p>
            </div>
          );
        })}
        {activeTypingFrom ? <TypingBubble from={activeTypingFrom} /> : null}
      </div>

      {footer}
    </div>
  );
}
