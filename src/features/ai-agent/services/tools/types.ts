export type ToolContext = {
  /** The WhatsApp sender's phone number — backend-controlled, never something Claude supplies. */
  patientPhone: string;
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
