import "server-only";
import { db } from "@/lib/db";

const MAX_HISTORY_MESSAGES = 20;

export type StoredMessage = { role: "user" | "assistant"; content: string };

export async function loadConversationHistory(patientId: string): Promise<StoredMessage[]> {
  const rows = await db.conversation.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_MESSAGES,
  });
  return rows.reverse().map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
  }));
}

export async function appendMessage(
  patientId: string,
  message: StoredMessage,
  wamid?: string,
): Promise<void> {
  await db.conversation.create({
    data: { patientId, role: message.role, content: message.content, wamid },
  });
}

export async function hasProcessedWamid(wamid: string): Promise<boolean> {
  const existing = await db.conversation.findUnique({ where: { wamid } });
  return existing !== null;
}
