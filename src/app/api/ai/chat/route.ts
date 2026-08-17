import { NextResponse } from "next/server";
import { runAgentTurn } from "@/features/ai-agent/services/agent-loop";

// Direct test endpoint for the agent loop — bypasses WhatsApp entirely.
// curl -X POST localhost:3000/api/ai/chat -d '{"phone":"+15551234567","message":"..."}'
export async function POST(request: Request) {
  const { phone, message } = (await request.json()) as { phone?: string; message?: string };
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
  }

  try {
    const reply = await runAgentTurn(phone, message);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent turn failed" },
      { status: 500 },
    );
  }
}
