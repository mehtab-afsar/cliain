import { NextResponse } from "next/server";
import { findTool } from "@/features/ai-agent/services/tools";
import { getDoctorById } from "@/features/appointments/services/doctor-repository";
import { getVapiWebhookSecret } from "@/lib/integration-credentials";
import { verifyVapiSecret } from "@/lib/webhook-signatures";

type RouteParams = { params: Promise<{ doctorId: string }> };

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

// Per-clinic URL — the doctorId in the path is the tenant key, set as this clinic's own
// "Tool webhook URL" when configuring their Vapi assistant (see Settings → Integrations).
export async function POST(request: Request, { params }: RouteParams) {
  const { doctorId } = await params;

  try {
    await getDoctorById(doctorId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // Skipped (not skippable) once a clinic has set a webhook secret — until then, connecting
  // Vapi at all still works, just without this extra check.
  const webhookSecret = await getVapiWebhookSecret(doctorId);
  if (webhookSecret) {
    const secretHeader = request.headers.get("x-vapi-secret");
    if (!verifyVapiSecret(secretHeader, webhookSecret)) {
      return new NextResponse("Invalid secret", { status: 401 });
    }
  }

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

  const results = await Promise.all(
    toolCalls.map(async (call) => {
      const tool = findTool(call.name);
      const result = tool
        ? await tool.execute(call.arguments, { patientPhone, doctorId })
        : { error: `Unknown tool: ${call.name}` };
      return { toolCallId: call.id, result: JSON.stringify(result) };
    }),
  );

  return NextResponse.json({ results });
}
