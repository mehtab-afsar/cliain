// Manual verification for the slot-computation logic, independent of Claude/WhatsApp.
// Usage: npx tsx scripts/check-availability.ts 2026-08-19 [earliestTime] [latestTime]
import { checkAvailability } from "../src/features/appointments/services/availability-service";
import { getPrimaryDoctor } from "../src/features/appointments/services/doctor-repository";

async function main() {
  const [date, earliestTime, latestTime] = process.argv.slice(2);
  if (!date) {
    console.error("Usage: npx tsx scripts/check-availability.ts YYYY-MM-DD [HH:MM] [HH:MM]");
    process.exit(1);
  }

  const doctor = await getPrimaryDoctor();
  const slots = await checkAvailability(doctor.id, { date, earliestTime, latestTime });
  if (slots.length === 0) {
    console.log(`No open slots on ${date}.`);
    return;
  }
  console.log(`Open slots on ${date}:`);
  for (const slot of slots) {
    console.log(`  ${slot.label}  (${slot.startAt} – ${slot.endAt})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
