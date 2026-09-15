import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { sendTestMessage, resetTestPatient } from "@/features/ai-agent/services/test-assistant-service";

/** Powers the "Try it out" dashboard page — runs the exact same agent loop WhatsApp/voice use,
 *  just triggered by a signed-in staff member instead of a real patient. Unlike /api/ai/chat
 *  (dev-only, unauthenticated, any doctorId) this is gated by a real session (see proxy.ts) and
 *  always uses the caller's own clinic, so it's safe to leave enabled in production too — which
 *  matters, since a demo might run against a deployed build, not just `next dev`. */
export async function POST(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const { message } = (await request.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  }

  try {
    const reply = await sendTestMessage(doctorId, message.trim());
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const { doctorId } = await requireCurrentDoctor();
  await resetTestPatient(doctorId);
  return NextResponse.json({ ok: true });
}
