import "server-only";
import { db } from "@/lib/db";

export async function getTenantById(tenantId: string) {
  return db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
}

/**
 * clinic-v1 (and every template today) gives a tenant exactly one bookable resource — this is
 * the seam that keeps the booking/availability code resource-aware without every call site
 * needing to know which resource to ask for yet. A future multi-resource template picks a
 * specific resource explicitly instead of calling this.
 */
export async function getPrimaryResourceForTenant(tenantId: string) {
  return db.resource.findFirstOrThrow({
    where: { tenantId },
    include: { workingHours: true, location: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPrimaryOfferingForTenant(tenantId: string) {
  return db.offering.findFirstOrThrow({
    where: { tenantId, active: true },
    orderBy: { createdAt: "asc" },
  });
}
