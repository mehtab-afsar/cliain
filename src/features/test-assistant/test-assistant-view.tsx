"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Mic, RotateCcw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { useAppointments, StatusBadge } from "@/features/appointments";
import { TEST_PATIENT_PHONE } from "@/features/ai-agent/test-patient";
import { resolveTemplateByVersion } from "@/features/templates/registry";
import { useTestAssistant } from "./hooks/use-test-assistant";
import { isVoiceModeSupported, useVoiceMode } from "./hooks/use-voice-mode";

type Mode = "message" | "voice";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TestAssistantView({ templateVersion }: { templateVersion: string }) {
  const { labels } = resolveTemplateByVersion(templateVersion);
  const { messages, sending, error, send, reset } = useTestAssistant();
  const { appointments } = useAppointments();
  const [mode, setMode] = useState<Mode>("message");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceSupported = useMemo(() => isVoiceModeSupported(), []);

  // `speak` (from useVoiceMode below) doesn't exist yet at the point handleTranscript is
  // defined, and useVoiceMode needs handleTranscript as an argument — a ref breaks the cycle
  // instead of the two hooks depending on each other's output.
  const speakRef = useRef<(text: string) => void>(() => {});

  const handleTranscript = useCallback(
    async (text: string) => {
      const reply = await send(text);
      if (reply) speakRef.current(reply);
    },
    [send],
  );

  const { listening, startListening, stopListening, speak } = useVoiceMode(handleTranscript);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const testAppointments = (appointments ?? []).filter(
    (appointment) => appointment.patient.phone === TEST_PATIENT_PHONE,
  );

  async function handleSend() {
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    await send(text);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Try it out"
        description={`Talk to your own AI assistant exactly like a ${labels.customerSingular.toLowerCase()} would — no WhatsApp number, no Meta App, no phone call needed to test it.`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("message")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "message" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Message
              </button>
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "voice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Voice
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} disabled={sending}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset conversation
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="flex h-[420px] flex-col gap-2.5 overflow-y-auto rounded-lg border border-border bg-background p-4"
          >
            {messages.length === 0 ? (
              <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
                {mode === "message"
                  ? `Type as a ${labels.customerSingular.toLowerCase()} would — "Hi, can I get ${
                      /^[aeiou]/i.test(labels.bookingSingular) ? "an" : "a"
                    } ${labels.bookingSingular.toLowerCase()} tomorrow afternoon?"`
                  : voiceSupported
                    ? `Tap the mic and talk as a ${labels.customerSingular.toLowerCase()} would.`
                    : "Voice mode needs Chrome or Edge — switch to Message above."}
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "assistant"
                      ? "max-w-[85%] self-start rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground"
                      : "max-w-[85%] self-end rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
                  }
                >
                  {message.content}
                </div>
              ))
            )}
            {sending ? (
              <div className="max-w-[85%] self-start rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
                …
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {mode === "message" ? (
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="min-h-9 resize-none"
              />
              <Button onClick={handleSend} disabled={sending || !draft.trim()}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <Button
                type="button"
                size="lg"
                variant={listening ? "destructive" : "default"}
                disabled={!voiceSupported || sending}
                onClick={listening ? stopListening : startListening}
                className="gap-2 rounded-full px-6"
              >
                {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? "Listening… tap to stop" : "Tap to talk"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-sm text-foreground">What just happened</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This runs the exact same booking logic as WhatsApp and phone calls — nothing here
              is special-cased for testing. A booking made above shows up in{" "}
              <Link href="/dashboard/appointments" className="underline underline-offset-2">
                Appointments
              </Link>{" "}
              and{" "}
              <Link href="/dashboard/calendar" className="underline underline-offset-2">
                Calendar
              </Link>{" "}
              like any other.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground">
              Test {labels.customerSingular.toLowerCase()}&apos;s bookings
            </h3>
            {testAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing booked yet this session.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {testAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/dashboard/appointments/${appointment.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-2.5 text-xs hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{formatTime(appointment.startAt)}</span>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <span className="text-muted-foreground">{appointment.reason ?? "No reason given"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
