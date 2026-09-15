export async function sendTestMessage(message: string): Promise<string | null> {
  const response = await fetch("/api/dashboard/test-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const body = (await response.json()) as { reply?: string | null; error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to send message.");
  }
  return body.reply ?? null;
}

export async function resetTestConversation(): Promise<void> {
  await fetch("/api/dashboard/test-assistant", { method: "DELETE" });
}
