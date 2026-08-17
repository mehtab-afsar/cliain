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
    // A Doctor row only ever exists after a first successful submit.
    completedAt: doctor.updatedAt.toISOString(),
  };
}

// Single-clinic, single-doctor MVP: no auth/tenancy yet, so we operate on the
// one Doctor row that exists rather than scoping by a signed-in user.
export async function getOnboardingDraft(): Promise<OnboardingDraft | null> {
  const doctor = await db.doctor.findFirst({
    include: { workingHours: true },
    orderBy: { createdAt: "asc" },
  });
  return doctor ? mapDoctorToDraft(doctor) : null;
}

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<OnboardingDraft> {
  const existing = await db.doctor.findFirst({ orderBy: { createdAt: "asc" } });

  const doctorData = {
    clinicName: draft.clinicBasics.clinicName,
    timezone: draft.clinicBasics.timezone,
    name: draft.doctorProfile.doctorName,
    specialty: draft.doctorProfile.specialty || null,
    whatsappPhone: draft.doctorProfile.whatsappNumber || null,
  };

  const doctor = existing
    ? await db.doctor.update({ where: { id: existing.id }, data: doctorData })
    : await db.doctor.create({ data: doctorData });

  await Promise.all(
    draft.workingHours.map((day) =>
      db.workingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId: doctor.id, dayOfWeek: day.dayOfWeek } },
        create: {
          doctorId: doctor.id,
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

  const saved = await getOnboardingDraft();
  if (!saved) throw new Error("Failed to reload onboarding draft after save.");
  return saved;
}
