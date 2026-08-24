export type ToolContext = {
  /** The WhatsApp sender's phone number — backend-controlled, never something Claude supplies. */
  patientPhone: string;
  /**
   * Which clinic this conversation belongs to — currently always the legacy
   * singleton (see doctor-repository.ts's getPrimaryDoctor), since resolving the
   * real tenant from a WhatsApp/Vapi webhook is a follow-up stage, not part of
   * this multi-tenant migration. Threaded through so Patient/Appointment
   * lookups compile against the now-tenant-scoped schema.
   */
  doctorId: string;
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
