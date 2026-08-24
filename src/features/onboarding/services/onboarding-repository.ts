import "server-only";
import { db } from "@/lib/db";
import type { Doctor, WorkingHours } from "@prisma/client";
import type { OnboardingDraft } from "../types";
import { WEEKDAY_LABELS } from "../types";

type DoctorWithHours = Doctor & { workingHours: WorkingHours[] };

function mapDoctorToDraft(doctor: DoctorWithHours): OnboardingDraft {
  const hoursByDay = new Map(doctor.workingHours.map((day) => [day.dayOfWeek, day]));

  return {
    clinicBasics: {
      clinicName: doctor.clinicName ?? "",
      timezone: doctor.timezone,
    },
    doctorProfile: {
      doctorName: doctor.name,
      specialty: doctor.specialty ?? "",
      whatsappNumber: doctor.whatsappPhone ?? "",
    },
    workingHours: WEEKDAY_LABELS.map((label, dayOfWeek) => {
      const existing = hoursByDay.get(dayOfWeek);
      return {
        dayOfWeek,
        label,
        isOpen: existing?.isOpen ?? (dayOfWeek >= 1 && dayOfWeek <= 5),
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
      };
    }),
    completedAt: doctor.updatedAt.toISOString(),
  };
}

async function upsertWorkingHours(doctorId: string, draft: OnboardingDraft): Promise<void> {
  await Promise.all(
    draft.workingHours.map((day) =>
      db.workingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: day.dayOfWeek } },
        create: {
          doctorId,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          startTime: day.startTime,
          endTime: day.endTime,
        },
        update: {
          isOpen: day.isOpen,
          startTime: day.startTime,
          endTime: day.endTime,
        },
      }),
    ),
  );
}

/** Reads an existing clinic's draft — used by the dashboard settings edit flow. */
export async function getOnboardingDraft(doctorId: string): Promise<OnboardingDraft | null> {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { workingHours: true },
  });
  return doctor ? mapDoctorToDraft(doctor) : null;
}

function doctorDataFromDraft(draft: OnboardingDraft) {
  return {
    clinicName: draft.clinicBasics.clinicName,
    timezone: draft.clinicBasics.timezone,
    name: draft.doctorProfile.doctorName,
    specialty: draft.doctorProfile.specialty || null,
    whatsappPhone: draft.doctorProfile.whatsappNumber || null,
  };
}

/** Always creates a brand-new clinic, owned by `userId` — the one-time "no membership yet" flow. */
export async function createClinic(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ draft: OnboardingDraft; doctorId: string }> {
  const doctor = await db.$transaction(async (tx) => {
    const created = await tx.doctor.create({ data: doctorDataFromDraft(draft) });
    await tx.membership.create({ data: { userId, doctorId: created.id, role: "owner" } });
    return created;
  });

  await upsertWorkingHours(doctor.id, draft);

  const saved = await getOnboardingDraft(doctor.id);
  if (!saved) throw new Error("Failed to reload onboarding draft after creating the clinic.");
  return { draft: saved, doctorId: doctor.id };
}

/** Updates an existing clinic — the dashboard settings edit flow. */
export async function updateClinic(doctorId: string, draft: OnboardingDraft): Promise<OnboardingDraft> {
  await db.doctor.update({ where: { id: doctorId }, data: doctorDataFromDraft(draft) });
  await upsertWorkingHours(doctorId, draft);

  const saved = await getOnboardingDraft(doctorId);
  if (!saved) throw new Error("Failed to reload onboarding draft after updating the clinic.");
  return saved;
}
