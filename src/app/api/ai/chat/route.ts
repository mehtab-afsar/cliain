import { NextResponse } from "next/server";
import { runAgentTurn } from "@/features/ai-agent/services/agent-loop";

// Direct test endpoint for the agent loop — bypasses WhatsApp entirely. doctorId identifies
// which clinic to test against (find yours in Settings → Integrations, or the dashboard URL).
// curl -X POST localhost:3000/api/ai/chat -d '{"doctorId":"...","phone":"+15551234567","message":"..."}'
//
// Dev-only: unauthenticated and accepts any doctorId, so in production this is an open door
// to unlimited Anthropic spend and unauthorized agent access. Disabled outside development.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

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
