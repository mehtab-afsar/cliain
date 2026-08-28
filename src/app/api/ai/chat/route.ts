import { NextResponse } from "next/server";
import { runAgentTurn } from "@/features/ai-agent/services/agent-loop";

// Direct test endpoint for the agent loop — bypasses WhatsApp entirely. doctorId identifies
// which clinic to test against (find yours in Settings → Integrations, or the dashboard URL).
// curl -X POST localhost:3000/api/ai/chat -d '{"doctorId":"...","phone":"+15551234567","message":"..."}'
export async function POST(request: Request) {
  const { doctorId, phone, message } = (await request.json()) as {
    doctorId?: string;
    phone?: string;
    message?: string;
  };
  if (!doctorId || !phone || !message) {
    return NextResponse.json({ error: "doctorId, phone, and message are required" }, { status: 400 });
  }

  try {
    const reply = await runAgentTurn(doctorId, phone, message);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent turn failed" },
      { status: 500 },
    );
  }
}
