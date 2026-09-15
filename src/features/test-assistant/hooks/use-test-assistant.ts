"use client";

import { useCallback, useState } from "react";
import { resetTestConversation, sendTestMessage } from "../services/test-assistant-client";

export type TestMessage = { role: "user" | "assistant"; content: string };

export function useTestAssistant() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return null;

      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSending(true);
      try {
        const reply = await sendTestMessage(trimmed);
        if (reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        }
        return reply;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        return null;
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const reset = useCallback(async () => {
    await resetTestConversation();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sending, error, send, reset };
}
