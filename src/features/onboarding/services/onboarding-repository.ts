import "server-only";
import { DateTime, type WeekdayNumbers } from "luxon";
import { db } from "@/lib/db";
import type { Tenant, Resource, WorkingHours, Offering, Session as SessionRow } from "@prisma/client";
import { getTemplateVertical, resolveTemplateByVersion } from "@/features/templates/registry";
import { resolveTimezone } from "@/lib/timezone";
import { createSession } from "@/features/appointments/services/session-service";
import type { OnboardingDraft } from "../types";
import { WEEKDAY_LABELS } from "../types";
import { getDraftTemplateVersion } from "../step-registry";
import { getOnboardingWriteAdapter } from "./onboarding-adapters";

// No recurring-timetable generator exists yet (PRD module M9) — onboarding bulk-creates this
// many weeks of Session rows up front from the chosen weekly slot, and a class stops appearing
// once that window runs out. See the Session model's schema comment for the same caveat.
const CLASS_BULK_CREATE_WEEKS = 4;

type TenantWithOnboardingData = Tenant & {
  resources: Array<Resource & { workingHours: WorkingHours[]; sessions: SessionRow[] }>;
  offerings: Offering[];
};

/** Composition-root read of an existing tenant's chosen template — same sanctioned role as
 *  getDraftTemplateVersion() in step-registry.ts, for the read/update paths where a Tenant row
 *  (not a client draft) is the source of the template choice. */
function getTenantTemplateVersion(tenant: Pick<Tenant, "templateVersion">): string {
  // eslint-disable-next-line no-restricted-syntax -- composition-root tenant-template lookup, see doc comment above
  return tenant.templateVersion;
}

function buildWorkingHoursDraft(resource: TenantWithOnboardingData["resources"][number]) {
  const hoursByDay = new Map(resource.workingHours.map((day) => [day.dayOfWeek, day]));
  return WEEKDAY_LABELS.map((label, dayOfWeek) => {
    const existing = hoursByDay.get(dayOfWeek);
    return {
      dayOfWeek,
      label,
      isOpen: existing?.isOpen ?? (dayOfWeek >= 1 && dayOfWeek <= 5),
      startTime: existing?.startTime ?? "09:00",
      endTime: existing?.endTime ?? "17:00",
    };
  });
}

function mapTenantToDraft(tenant: TenantWithOnboardingData): OnboardingDraft | null {
  const resource = tenant.resources[0];
  if (!resource) return null;
  const templateVersion = getTenantTemplateVersion(tenant);
  const template = resolveTemplateByVersion(templateVersion);
  const attributes = (resource.attributes ?? {}) as { specialty?: string; role?: string };
  const workingHours = buildWorkingHoursDraft(resource);
  const base = { templateVersion, workingHours, completedAt: tenant.updatedAt.toISOString() };

  if (template.version === "gym-v1") {
    const offering = tenant.offerings[0];
    const firstSession = resource.sessions[0];
    // Approximated from the earliest still-scheduled Session, since there's no separate
    // "recurring slot" record — good enough for re-populating the wizard on edit, not exact
    // once staff have started moving individual classes around.
    const zone = resolveTimezone(tenant.timezone);
    const sessionLocal = firstSession ? DateTime.fromJSDate(firstSession.startAt, { zone }) : null;
    return {
      ...base,
      gymBasics: { gymName: tenant.clinicName ?? "", timezone: tenant.timezone },
      trainerProfile: {
        trainerName: resource.name,
        role: attributes.role ?? "",
        whatsappNumber: tenant.whatsappPhone ?? "",
      },
      classSetup: offering
        ? {
            className: offering.name,
            durationMinutes: offering.durationMinutes,
            capacity: firstSession?.capacity ?? offering.defaultCapacity ?? 12,
            dayOfWeek: sessionLocal?.weekday === 7 ? 0 : (sessionLocal?.weekday ?? 1),
            startTime: sessionLocal ? sessionLocal.toFormat("HH:mm") : "18:00",
          }
        : undefined,
    };
  }

  return {
    ...base,
    clinicBasics: { clinicName: tenant.clinicName ?? "", timezone: tenant.timezone },
    doctorProfile: {
      doctorName: resource.name,
      specialty: attributes.specialty ?? "",
      whatsappNumber: tenant.whatsappPhone ?? "",
    },
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

/** Bulk-creates CLASS_BULK_CREATE_WEEKS weeks of Session rows for a class-mode offering from
 *  the wizard's chosen weekly slot — see the module-level comment on the deferred recurring
 *  generator. Skips a week that's already in the past relative to "now". */
async function bulkCreateClassSessions(
  tenantId: string,
  offeringId: string,
  resourceId: string,
  timezone: string,
  classSetup: NonNullable<OnboardingDraft["classSetup"]>,
): Promise<void> {
  const zone = resolveTimezone(timezone);
  const { hour, minute } = { hour: Number(classSetup.startTime.split(":")[0]), minute: Number(classSetup.startTime.split(":")[1]) };
  const now = DateTime.now().setZone(zone);

  const weekday = (classSetup.dayOfWeek === 0 ? 7 : classSetup.dayOfWeek) as WeekdayNumbers;
  let firstOccurrence = now.set({ weekday, hour, minute, second: 0, millisecond: 0 });
  if (firstOccurrence < now) firstOccurrence = firstOccurrence.plus({ weeks: 1 });

  for (let week = 0; week < CLASS_BULK_CREATE_WEEKS; week += 1) {
    const startAt = firstOccurrence.plus({ weeks: week });
    const endAt = startAt.plus({ minutes: classSetup.durationMinutes });
    await createSession(tenantId, {
      offeringId,
      resourceId,
      startAt: startAt.toJSDate(),
      endAt: endAt.toJSDate(),
      capacity: classSetup.capacity,
    });
  }
}

async function fetchTenantWithOnboardingData(tenantId: string): Promise<TenantWithOnboardingData | null> {
  return db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      resources: {
        include: { workingHours: true, sessions: { orderBy: { startAt: "asc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      offerings: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
}

/** Reads an existing tenant's draft — used by the dashboard settings edit flow. */
export async function getOnboardingDraft(tenantId: string): Promise<OnboardingDraft | null> {
  const tenant = await fetchTenantWithOnboardingData(tenantId);
  return tenant ? mapTenantToDraft(tenant) : null;
}

function tenantDataFromDraft(
  vertical: string,
  templateVersion: string,
  adapter: ReturnType<typeof getOnboardingWriteAdapter>,
  draft: OnboardingDraft,
) {
  return {
    clinicName: adapter.businessName(draft),
    timezone: adapter.businessTimezone(draft),
    whatsappPhone: adapter.ownerWhatsappNumber(draft),
    vertical,
    templateVersion,
  };
}

/** Always creates a brand-new tenant, owned by `userId` — the one-time "no membership yet" flow. */
export async function createTenant(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ draft: OnboardingDraft; doctorId: string }> {
  const templateVersion = getDraftTemplateVersion(draft);
  const template = resolveTemplateByVersion(templateVersion);
  const adapter = getOnboardingWriteAdapter(templateVersion);

  const created = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: tenantDataFromDraft(getTemplateVertical(template), templateVersion, adapter, draft),
    });
    await tx.membership.create({ data: { userId, tenantId: tenant.id, role: "owner" } });

    const location = await tx.location.create({
      data: {
        tenantId: tenant.id,
        name: tenant.clinicName,
        timezone: tenant.timezone,
        isPrimary: true,
      },
    });

    const resource = await tx.resource.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        type: template.defaultOffering.resourceType,
        name: adapter.resourceName(draft),
        attributes: adapter.resourceAttributes(draft),
      },
    });

    const offering = await tx.offering.create({
      data: {
        tenantId: tenant.id,
        name: adapter.offeringName(draft, template.defaultOffering.name),
        durationMinutes: adapter.offeringDurationMinutes(draft, template.defaultOffering.durationMinutes),
        resourceType: template.defaultOffering.resourceType,
        mode: template.defaultOffering.mode,
        defaultCapacity: adapter.offeringCapacity(draft, template.defaultOffering.defaultCapacity),
      },
    });

    return { tenant, resource, offering };
  });

  await upsertWorkingHours(created.resource.id, draft);

  // Bulk session creation is a booking-*mode* concern (like the dispatch in
  // appointment-service.ts's bookAppointment), not a vertical one — any future mode="class"
  // template gets this for free without needing its own registration here.
  if (template.defaultOffering.mode === "class" && draft.classSetup) {
    await bulkCreateClassSessions(
      created.tenant.id,
      created.offering.id,
      created.resource.id,
      created.tenant.timezone,
      draft.classSetup,
    );
  }

  const saved = await getOnboardingDraft(created.tenant.id);
  if (!saved) throw new Error("Failed to reload onboarding draft after creating the tenant.");
  return { draft: saved, doctorId: created.tenant.id };
}

/** Updates an existing tenant — the dashboard settings edit flow. */
export async function updateTenant(tenantId: string, draft: OnboardingDraft): Promise<OnboardingDraft> {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const templateVersion = getTenantTemplateVersion(tenant);
  const template = resolveTemplateByVersion(templateVersion);
  const adapter = getOnboardingWriteAdapter(templateVersion);
  const resource = await db.resource.findFirstOrThrow({ where: { tenantId }, orderBy: { createdAt: "asc" } });

  await db.tenant.update({
    where: { id: tenantId },
    data: tenantDataFromDraft(getTemplateVertical(template), templateVersion, adapter, draft),
  });
  await db.resource.update({
    where: { id: resource.id },
    data: {
      name: adapter.resourceName(draft) || resource.name,
      attributes: adapter.resourceAttributes(draft),
    },
  });
  await upsertWorkingHours(resource.id, draft);

  const saved = await getOnboardingDraft(tenantId);
  if (!saved) throw new Error("Failed to reload onboarding draft after updating the tenant.");
  return saved;
}
