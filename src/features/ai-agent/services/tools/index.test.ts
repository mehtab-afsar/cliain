import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { mintToolToken } from "../tool-token";
import { runTool } from "./index";
import { clinicV1Template } from "@/features/templates/clinic-v1";

const SHARED_PHONE = `+1555${Date.now()}${Math.floor(Math.random() * 1000)}`;
const TERMS = clinicV1Template.terms;

async function createTenantWithCustomer(name: string) {
  const tenant = await db.tenant.create({ data: { timezone: "UTC" } });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  await db.resource.create({
    data: { tenantId: tenant.id, locationId: location.id, type: "practitioner", name: "Dr. Test" },
  });
  const customer = await db.customer.create({
    data: { tenantId: tenant.id, name, phone: SHARED_PHONE },
  });
  return { tenant, customer };
}

async function cleanup(tenantId: string) {
  await db.booking.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

describe("runTool — Tool Gateway tenant binding", () => {
  let tenantAId: string | undefined;
  let tenantBId: string | undefined;

  afterEach(async () => {
    if (tenantAId) await cleanup(tenantAId);
    if (tenantBId) await cleanup(tenantBId);
    tenantAId = undefined;
    tenantBId = undefined;
  });

  it("a token minted for tenant A only ever surfaces tenant A's data, even when tenant B has a customer with the identical phone number", async () => {
    const { tenant: tenantA, customer: customerA } = await createTenantWithCustomer("Alice");
    tenantAId = tenantA.id;
    const { tenant: tenantB } = await createTenantWithCustomer("Bob");
    tenantBId = tenantB.id;

    const tokenA = mintToolToken({ tenantId: tenantA.id, channel: "whatsapp" });

    const result = (await runTool("get_patient", {}, tokenA, SHARED_PHONE, TERMS)) as {
      patient: { id: string; name: string | null } | null;
    };

    expect(result.patient?.id).toBe(customerA.id);
    expect(result.patient?.name).toBe("Alice");
  });

  it("rejects a forged/invalid token without touching any tenant's data", async () => {
    const { tenant: tenantA } = await createTenantWithCustomer("Alice");
    tenantAId = tenantA.id;

    const result = await runTool("get_patient", {}, "not-a-real-token", SHARED_PHONE, TERMS);
    expect(result).toEqual({ error: "Invalid or expired session." });
  });

  it("a mismatched-tenant path can't be smuggled in — runTool has no parameter for one", async () => {
    // There is deliberately no `tenantId` argument to runTool at all (see ./index.ts) — the
    // only way to influence which tenant a tool call touches is by holding a valid token for
    // it. This test exists as living documentation of that invariant; TypeScript itself is
    // what actually enforces it (a tenantId argument here would be a compile error).
    const { tenant: tenantA, customer: customerA } = await createTenantWithCustomer("Alice");
    tenantAId = tenantA.id;

    const tokenA = mintToolToken({ tenantId: tenantA.id, channel: "whatsapp" });
    const result = (await runTool("get_patient", {}, tokenA, SHARED_PHONE, TERMS)) as {
      patient: { id: string } | null;
    };
    expect(result.patient?.id).toBe(customerA.id);
  });
});
