import "server-only";
import { db } from "@/lib/db";

const MAX_HISTORY_MESSAGES = 20;

export type StoredMessage = { role: "user" | "assistant"; content: string };

export async function loadConversationHistory(customerId: string): Promise<StoredMessage[]> {
  const rows = await db.conversation.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_MESSAGES,
  });
  return rows.reverse().map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
  }));
}

export async function appendMessage(
  customerId: string,
  message: StoredMessage,
  wamid?: string,
): Promise<void> {
  await db.conversation.create({
    data: { customerId, role: message.role, content: message.content, wamid },
  });
}

export async function hasProcessedWamid(wamid: string): Promise<boolean> {
  const existing = await db.conversation.findUnique({ where: { wamid } });
  return existing !== null;
}
