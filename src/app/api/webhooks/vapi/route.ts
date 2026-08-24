import { NextResponse } from "next/server";
import { findTool } from "@/features/ai-agent/services/tools";
import { getPrimaryDoctor } from "@/features/appointments/services/doctor-repository";

type VapiToolCall = { id: string; name: string; arguments: Record<string, unknown> };

// Vapi's own model drives the conversation and only calls us to execute a tool. The exact
// field Vapi uses for the caller's number wasn't confirmed against a live account at build
// time — this checks the documented shape plus a couple of likely fallbacks; adjust once
// you can inspect a real payload (log `payload` here temporarily) against your Vapi account.
type VapiWebhookPayload = {
  message: {
    type: string;
    toolCallList?: VapiToolCall[];
    call?: { customer?: { number?: string } };
    customer?: { number?: string };
    phoneNumber?: string;
  };
};

function resolvePatientPhone(payload: VapiWebhookPayload): string | null {
  const message = payload.message;
  return message.call?.customer?.number ?? message.customer?.number ?? message.phoneNumber ?? null;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as VapiWebhookPayload;

  if (payload.message?.type !== "tool-calls") {
    return NextResponse.json({});
  }

  const toolCalls = payload.message.toolCallList ?? [];
  const patientPhone = resolvePatientPhone(payload);

  if (!patientPhone) {
    return NextResponse.json({
      results: toolCalls.map((call) => ({
        toolCallId: call.id,
        result: JSON.stringify({ error: "Could not identify the caller's phone number." }),
      })),
    });
  }

  const doctor = await getPrimaryDoctor();
  const results = await Promise.all(
    toolCalls.map(async (call) => {
      const tool = findTool(call.name);
      const result = tool
        ? await tool.execute(call.arguments, { patientPhone, doctorId: doctor.id })
        : { error: `Unknown tool: ${call.name}` };
      return { toolCallId: call.id, result: JSON.stringify(result) };
    }),
  );

  return NextResponse.json({ results });
}
