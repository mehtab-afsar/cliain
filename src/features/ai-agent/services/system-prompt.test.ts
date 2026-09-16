import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSystemPrompt } from "./system-prompt";
import { clinicV1Template } from "@/features/templates/clinic-v1";
import type { ClinicSettingsData } from "@/features/settings/schema";

// Golden-output regression guard, added *before* genericizing buildSystemPrompt to read its
// safety rules / channel style / tone style from a resolved template (src/features/templates)
// instead of module-level constants — this is the only thing proving the clinic-v1 template's
// content is word-for-word identical to what shipped before that refactor. Settings are
// authored as ClinicSettingsData (what a tenant's document actually looks like) and converted
// via clinicV1Template.toCommonSettings(), same as config-resolver.ts does for real.
const FAKE_NOW = "2026-09-01T12:00:00.000Z";

const CLINIC_SETTINGS: ClinicSettingsData = {
  clinic: {
    name: "Sunrise Family Clinic",
    displayName: undefined,
    address: "12 MG Road, Bengaluru",
    languages: ["English", "Hindi"],
    phoneShownToPatients: "+918047182200",
  },
  doctors: [{ title: "Dr.", name: "Ananya Rao", specialty: "General Physician" }],
  safety: {
    emergencyScript: "Call 108 immediately or go to the nearest emergency room.",
    escalationWhatsappNumber: "+919845012233",
  },
  messaging: {
    greeting: undefined,
    tone: "friendly",
    disclosureEnabled: true,
  },
};

describe("buildSystemPrompt (clinic-v1 golden output)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FAKE_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("text channel, known patient", () => {
    const settings = clinicV1Template.toCommonSettings(CLINIC_SETTINGS);
    expect(buildSystemPrompt(clinicV1Template, settings, "Asia/Kolkata", "Priya Nair", "text")).toMatchSnapshot();
  });

  it("voice channel, new patient, with a call purpose", () => {
    const settings = clinicV1Template.toCommonSettings(CLINIC_SETTINGS);
    expect(
      buildSystemPrompt(
        clinicV1Template,
        settings,
        "Asia/Kolkata",
        null,
        "voice",
        "to confirm your appointment tomorrow at 3:00 PM",
      ),
    ).toMatchSnapshot();
  });

  it("formal tone, no languages configured", () => {
    const formalSettings: ClinicSettingsData = {
      ...CLINIC_SETTINGS,
      clinic: { ...CLINIC_SETTINGS.clinic, languages: [] },
      messaging: { ...CLINIC_SETTINGS.messaging, tone: "formal" },
    };
    const settings = clinicV1Template.toCommonSettings(formalSettings);
    expect(buildSystemPrompt(clinicV1Template, settings, "UTC", "Rahul Menon", "text")).toMatchSnapshot();
  });
});
