import "server-only";
import { db } from "@/lib/db";
import type { Tenant, Resource, WorkingHours } from "@prisma/client";
import type { OnboardingDraft } from "../types";
import { WEEKDAY_LABELS } from "../types";

const DEFAULT_OFFERING_DURATION_MINUTES = 30;

type TenantWithPrimaryResource = Tenant & {
  resources: Array<Resource & { workingHours: WorkingHours[] }>;
};

function mapTenantToDraft(tenant: TenantWithPrimaryResource): OnboardingDraft | null {
  const resource = tenant.resources[0];
  if (!resource) return null;
  const attributes = (resource.attributes ?? {}) as { specialty?: string };
  const hoursByDay = new Map(resource.workingHours.map((day) => [day.dayOfWeek, day]));

  return {
    clinicBasics: {
      clinicName: tenant.clinicName ?? "",
      timezone: tenant.timezone,
    },
    doctorProfile: {
      doctorName: resource.name,
      specialty: attributes.specialty ?? "",
      whatsappNumber: tenant.whatsappPhone ?? "",
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
    completedAt: tenant.updatedAt.toISOString(),
  };
}

async function upsertWorkingHours(resourceId: string, draft: OnboardingDraft): Promise<void> {
  await Promise.all(
    draft.workingHours.map((day) =>
      db.workingHours.upsert({
        where: { resourceId_dayOfWeek: { resourceId, dayOfWeek: day.dayOfWeek } },
        create: {
          resourceId,
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

/** Reads an existing tenant's draft — used by the dashboard settings edit flow. */
export async function getOnboardingDraft(tenantId: string): Promise<OnboardingDraft | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { resources: { include: { workingHours: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  return tenant ? mapTenantToDraft(tenant) : null;
}

function tenantDataFromDraft(draft: OnboardingDraft) {
  return {
    clinicName: draft.clinicBasics.clinicName,
    timezone: draft.clinicBasics.timezone,
    whatsappPhone: draft.doctorProfile.whatsappNumber || null,
  };
}

/** Always creates a brand-new tenant, owned by `userId` — the one-time "no membership yet" flow. */
export async function createClinic(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ draft: OnboardingDraft; doctorId: string }> {
  const resource = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: tenantDataFromDraft(draft) });
    await tx.membership.create({ data: { userId, tenantId: tenant.id, role: "owner" } });

    const location = await tx.location.create({
      data: {
        tenantId: tenant.id,
        name: draft.clinicBasics.clinicName,
        timezone: draft.clinicBasics.timezone,
        isPrimary: true,
      },
    });

    const createdResource = await tx.resource.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        type: "practitioner",
        name: draft.doctorProfile.doctorName,
        attributes: draft.doctorProfile.specialty ? { specialty: draft.doctorProfile.specialty } : {},
      },
    });

    await tx.offering.create({
      data: {
        tenantId: tenant.id,
        name: "Consultation",
        durationMinutes: DEFAULT_OFFERING_DURATION_MINUTES,
        resourceType: "practitioner",
      },
    });

    return createdResource;
  });

  await upsertWorkingHours(resource.id, draft);

  const saved = await getOnboardingDraft(resource.tenantId);
  if (!saved) throw new Error("Failed to reload onboarding draft after creating the clinic.");
  return { draft: saved, doctorId: resource.tenantId };
}

/** Updates an existing tenant — the dashboard settings edit flow. */
export async function updateClinic(tenantId: string, draft: OnboardingDraft): Promise<OnboardingDraft> {
  const resource = await db.resource.findFirstOrThrow({ where: { tenantId }, orderBy: { createdAt: "asc" } });

  await db.tenant.update({ where: { id: tenantId }, data: tenantDataFromDraft(draft) });
  await db.resource.update({
    where: { id: resource.id },
    data: {
      name: draft.doctorProfile.doctorName,
      attributes: draft.doctorProfile.specialty ? { specialty: draft.doctorProfile.specialty } : {},
    },
  });
  await upsertWorkingHours(resource.id, draft);

  const saved = await getOnboardingDraft(tenantId);
  if (!saved) throw new Error("Failed to reload onboarding draft after updating the clinic.");
  return saved;
}
