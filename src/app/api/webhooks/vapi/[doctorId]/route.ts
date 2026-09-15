import { NextResponse } from "next/server";
import { runTool } from "@/features/ai-agent/services/tools";
import { buildInboundAssistantConfig } from "@/features/ai-agent/services/vapi-client";
import { getDoctorById } from "@/features/appointments/services/doctor-repository";
import { resolveSettings } from "@/features/settings/services/settings-repository";
import { getVapiWebhookSecret } from "@/lib/integration-credentials";
import { vapiPublicUrl } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyVapiSecret } from "@/lib/webhook-signatures";

type RouteParams = { params: Promise<{ doctorId: string }> };

type VapiToolCall = { id: string; name: string; arguments: Record<string, unknown> };

const TOOL_CALL_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Tool call timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
//
// Every path below must resolve to a valid Vapi tool-result shape rather than an unhandled
// 500 — a raw crash gives Vapi nothing to recover with mid-call, killing the phone call for
// a real patient. The outer try/catch is a last-resort backstop; the per-call try/catch below
// is what actually matters, since one bad tool call must not take down every other tool call
// in the same batch.
export async function POST(request: Request, { params }: RouteParams) {
  const { doctorId } = await params;

  const { success } = await checkRateLimit(`vapi-webhook:${doctorId}`);
  if (!success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  let doctor;
  try {
    doctor = await getDoctorById(doctorId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // A webhook secret is required to connect Vapi at all (see saveIntegrationCredentials), so
  // this only stays unverified for clinics that connected before that requirement existed.
  const webhookSecret = await getVapiWebhookSecret(doctorId);
  if (webhookSecret) {
    const secretHeader = request.headers.get("x-vapi-secret");
    if (!verifyVapiSecret(secretHeader, webhookSecret)) {
      return new NextResponse("Invalid secret", { status: 401 });
    }
  }

  let payload: VapiWebhookPayload;
  try {
    payload = (await request.json()) as VapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Opt-in, off by default — flip on for one real test call to confirm the payload shape
  // assumed above (see the comment on VapiWebhookPayload), then flip back off.
  if (process.env.DEBUG_VAPI_WEBHOOK === "true") {
    console.log("[vapi-webhook] raw payload:", JSON.stringify(payload));
  }

  try {
    // Inbound call — the number has no static assistant attached (see
    // vapi-provisioning.ts), so Vapi asks here what assistant to run, at the start of every
    // inbound call. Built fresh per call so it always reflects this clinic's current Settings.
    if (payload.message?.type === "assistant-request") {
      const publicUrl = vapiPublicUrl();
      if (!publicUrl) {
        return NextResponse.json({ error: "No URL Vapi can reach is configured." }, { status: 500 });
      }
      const settings = await resolveSettings(doctorId);
      const assistant = buildInboundAssistantConfig(
        doctor,
        settings,
        `${publicUrl}/api/webhooks/vapi/${doctorId}`,
        webhookSecret,
      );
      return NextResponse.json({ assistant });
    }

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
        try {
          const result = await withTimeout(
            runTool(call.name, call.arguments, { patientPhone, doctorId, channel: "voice" }),
            TOOL_CALL_TIMEOUT_MS,
          );
          return { toolCallId: call.id, result: JSON.stringify(result) };
        } catch (error) {
          console.error(`[vapi-webhook] Tool "${call.name}" failed:`, error);
          return {
            toolCallId: call.id,
            result: JSON.stringify({ error: "Something went wrong handling this request." }),
          };
        }
      }),
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[vapi-webhook] Unhandled error:", error);
    return NextResponse.json({
      results: (payload.message?.toolCallList ?? []).map((call) => ({
        toolCallId: call.id,
        result: JSON.stringify({ error: "Something went wrong handling this request." }),
      })),
    });
  }
}
