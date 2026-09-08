export type ToolContext = {
  /** The WhatsApp sender's phone number — backend-controlled, never something Claude supplies. */
  patientPhone: string;
  /** Which clinic this conversation belongs to — resolved from the doctorId path segment in the per-clinic webhook URL (see src/app/api/webhooks). */
  doctorId: string;
  /** Which channel this tool call came in on — tags the AppointmentEvent audit trail. */
  channel: "whatsapp" | "voice";
};

export type ToolDefinition<Input = Record<string, unknown>> = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: Input, context: ToolContext) => Promise<unknown>;
};
