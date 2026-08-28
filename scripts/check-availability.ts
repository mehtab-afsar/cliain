// Manual verification for the slot-computation logic, independent of Claude/WhatsApp.
// Usage: npx tsx scripts/check-availability.ts <doctorId> 2026-08-19 [earliestTime] [latestTime]
// Find a clinic's doctorId in Settings → Integrations, or via `npx prisma studio`.
import { checkAvailability } from "../src/features/appointments/services/availability-service";
import { getDoctorById } from "../src/features/appointments/services/doctor-repository";

async function main() {
  const [doctorId, date, earliestTime, latestTime] = process.argv.slice(2);
  if (!doctorId || !date) {
    console.error(
      "Usage: npx tsx scripts/check-availability.ts <doctorId> YYYY-MM-DD [HH:MM] [HH:MM]",
    );
    process.exit(1);
  }

  const doctor = await getDoctorById(doctorId);
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
