// Seeds a realistic demo clinic (for screenshots / demos) onto the BYPASS_AUTH beta account.
// Usage: npx tsx --env-file=.env.local scripts/seed-demo.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DateTime } from "luxon";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ZONE = "Asia/Kolkata";
const BYPASS_EMAIL = "beta-tester@cliain.local";

function at(dayOffset: number, hhmm: string, minutes = 30) {
  const [h, m] = hhmm.split(":").map(Number);
  const start = DateTime.now()
    .setZone(ZONE)
    .plus({ days: dayOffset })
    .set({ hour: h, minute: m, second: 0, millisecond: 0 });
  return { startAt: start.toJSDate(), endAt: start.plus({ minutes }).toJSDate() };
}

async function main() {
  const user = await db.user.upsert({
    where: { email: BYPASS_EMAIL },
    create: { email: BYPASS_EMAIL, name: "Beta Tester" },
    update: {},
  });

  const membership = await db.membership.findFirst({ where: { userId: user.id } });
  if (!membership) throw new Error("No membership for the beta account — run onboarding once first.");
  const doctorId = membership.doctorId;

  await db.doctor.update({
    where: { id: doctorId },
    data: {
      clinicName: "Sunrise Family Clinic",
      name: "Dr. Ananya Rao",
      specialty: "General Physician",
      timezone: ZONE,
      whatsappPhone: "+918047182200",
      escalationWhatsappNumber: "+919845012233",
    },
  });

  // Fresh slate for the demo tenant only.
  await db.appointmentEvent.deleteMany({ where: { doctorId } });
  await db.appointment.deleteMany({ where: { doctorId } });
  await db.conversation.deleteMany({ where: { patient: { doctorId } } });
  await db.patient.deleteMany({ where: { doctorId } });

  const hours = [
    { dayOfWeek: 0, isOpen: false, startTime: "09:00", endTime: "13:00" },
    { dayOfWeek: 1, isOpen: true, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 2, isOpen: true, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 3, isOpen: true, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 4, isOpen: true, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 5, isOpen: true, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 6, isOpen: true, startTime: "09:00", endTime: "14:00" },
  ];
  for (const h of hours) {
    await db.workingHours.upsert({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: h.dayOfWeek } },
      create: { doctorId, ...h },
      update: h,
    });
  }

  const people: [string, string][] = [
    ["Priya Nair", "+919845012233"],
    ["Rahul Menon", "+919886745120"],
    ["Sunita Deshpande", "+919945338271"],
    ["Arjun Iyer", "+919742018866"],
    ["Fatima Sheikh", "+919611204577"],
    ["Vikram Shetty", "+919980142309"],
    ["Meera Krishnan", "+919901556742"],
    ["Joseph Thomas", "+919845778901"],
    ["Aisha Rahman", "+919739025614"],
    ["Ganesh Prabhu", "+919008471235"],
    ["Neha Bhatt", "+919886220147"],
    ["Karthik Reddy", "+919449873310"],
    ["Lakshmi Venkatesh", "+919632077458"],
    ["Imran Qureshi", "+919845603312"],
  ];

  const patients: Record<string, string> = {};
  for (const [name, phone] of people) {
    const p = await db.patient.create({
      data: {
        doctorId,
        name,
        phone,
        consentGivenAt: DateTime.now().minus({ days: 20 }).toJSDate(),
      },
    });
    patients[name] = p.id;
  }

  type Row = {
    who: string;
    day: number;
    time: string;
    mins?: number;
    reason: string;
    status: "booked" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_show";
    statusReason?: string;
    channel: "whatsapp" | "voice";
  };

  const rows: Row[] = [
    // Today — a day that has already run.
    { who: "Ganesh Prabhu", day: 0, time: "09:30", reason: "Blood pressure review", status: "completed", channel: "whatsapp" },
    { who: "Neha Bhatt", day: 0, time: "10:00", reason: "Persistent cough", status: "completed", channel: "voice" },
    { who: "Imran Qureshi", day: 0, time: "10:30", reason: "Back pain", status: "no_show", statusReason: "auto: no arrival within grace period", channel: "whatsapp" },
    { who: "Lakshmi Venkatesh", day: 0, time: "11:15", reason: "Diabetes follow-up", status: "completed", channel: "whatsapp" },
    { who: "Priya Nair", day: 0, time: "12:00", reason: "Fever and sore throat", status: "completed", channel: "whatsapp" },
    { who: "Karthik Reddy", day: 0, time: "16:30", reason: "Skin rash", status: "completed", channel: "voice" },
    { who: "Joseph Thomas", day: 0, time: "17:30", reason: "Annual check-up", status: "cancelled", statusReason: "Patient rescheduling to next week", channel: "whatsapp" },
    { who: "Meera Krishnan", day: 0, time: "18:15", reason: "Migraine consultation", status: "completed", channel: "whatsapp" },
    // Tomorrow
    { who: "Rahul Menon", day: 1, time: "09:00", reason: "Chest congestion", status: "booked", channel: "whatsapp" },
    { who: "Sunita Deshpande", day: 1, time: "09:30", reason: "Thyroid report review", status: "booked", channel: "voice" },
    { who: "Arjun Iyer", day: 1, time: "10:15", reason: "Sprained ankle", status: "booked", channel: "whatsapp" },
    { who: "Fatima Sheikh", day: 1, time: "11:00", reason: "Child vaccination", status: "booked", channel: "whatsapp" },
    { who: "Vikram Shetty", day: 1, time: "12:30", reason: "Acidity and heartburn", status: "booked", channel: "voice" },
    { who: "Aisha Rahman", day: 1, time: "16:00", reason: "Follow-up on lab results", status: "booked", channel: "whatsapp" },
    { who: "Ganesh Prabhu", day: 1, time: "17:00", reason: "Prescription renewal", status: "booked", channel: "whatsapp" },
    // Day after
    { who: "Priya Nair", day: 2, time: "09:30", reason: "Fever follow-up", status: "booked", channel: "whatsapp" },
    { who: "Neha Bhatt", day: 2, time: "10:30", reason: "Ear infection", status: "booked", channel: "voice" },
    { who: "Karthik Reddy", day: 2, time: "11:30", reason: "Allergy consultation", status: "booked", channel: "whatsapp" },
    { who: "Joseph Thomas", day: 2, time: "16:45", reason: "Annual check-up", status: "booked", channel: "whatsapp" },
    { who: "Meera Krishnan", day: 3, time: "09:15", reason: "Migraine follow-up", status: "booked", channel: "whatsapp" },
    { who: "Imran Qureshi", day: 3, time: "10:45", reason: "Back pain", status: "booked", channel: "voice" },
    { who: "Lakshmi Venkatesh", day: 3, time: "17:15", reason: "Diabetes follow-up", status: "booked", channel: "whatsapp" },
  ];

  const now = new Date();
  let detailId = "";

  for (const row of rows) {
    const { startAt, endAt } = at(row.day, row.time, row.mins ?? 30);
    const createdAt = DateTime.fromJSDate(startAt).minus({ days: 2, hours: 3 }).toJSDate();
    const appt = await db.appointment.create({
      data: {
        doctorId,
        patientId: patients[row.who],
        startAt,
        endAt,
        status: row.status,
        statusReason: row.statusReason ?? null,
        reason: row.reason,
        createdAt,
        // Pre-marked so the local scheduler never tries a real outbound send for demo rows.
        reminder24hSentAt: row.day >= 1 ? DateTime.fromJSDate(startAt).minus({ hours: 24 }).toJSDate() : now,
        reminder2hSentAt: row.day === 0 ? DateTime.fromJSDate(startAt).minus({ hours: 2 }).toJSDate() : now,
        completedAt: row.status === "completed" ? endAt : null,
        googleCalendarEventId: `gcal_${Math.random().toString(36).slice(2, 12)}`,
      },
    });

    const trail: { from: Row["status"] | null; to: Row["status"]; actor: string; channel: string | null; minutes: number; reason?: string }[] = [
      { from: null, to: "booked", actor: "ai", channel: row.channel, minutes: -2880 },
    ];
    if (row.status === "completed") {
      trail.push({ from: "booked", to: "arrived", actor: "staff:reception", channel: "dashboard", minutes: -6 });
      trail.push({ from: "arrived", to: "in_progress", actor: "staff:reception", channel: "dashboard", minutes: 3 });
      trail.push({ from: "in_progress", to: "completed", actor: "staff:reception", channel: "dashboard", minutes: 28 });
    } else if (row.status === "no_show") {
      trail.push({ from: "booked", to: "no_show", actor: "scheduler", channel: null, minutes: 60, reason: "auto: no arrival within grace period" });
    } else if (row.status === "cancelled") {
      trail.push({ from: "booked", to: "cancelled", actor: "ai", channel: "whatsapp", minutes: -180, reason: row.statusReason });
    }

    for (const step of trail) {
      await db.appointmentEvent.create({
        data: {
          appointmentId: appt.id,
          doctorId,
          at: DateTime.fromJSDate(startAt).plus({ minutes: step.minutes }).toJSDate(),
          fromStatus: step.from,
          toStatus: step.to,
          actor: step.actor,
          channel: step.channel,
          reason: step.reason ?? null,
        },
      });
    }

    if (row.who === "Priya Nair" && row.day === 0) detailId = appt.id;
  }

  // WhatsApp transcripts.
  const transcripts: Record<string, [string, string][]> = {
    "Priya Nair": [
      ["user", "Hi, is the doctor free today? I've had a fever since last night"],
      ["assistant", "Hi Priya — sorry to hear that. I'm the AI assistant for Sunrise Family Clinic; a member of the team can see this conversation at any time. Dr. Rao has openings today at 12:00 PM, 12:30 PM and 4:00 PM. Which suits you?"],
      ["user", "12 works"],
      ["assistant", "Booked — Tuesday 8 September at 12:00 PM with Dr. Ananya Rao, for a fever and sore throat. You'll get a reminder the day before and two hours ahead. Anything else?"],
      ["user", "No thanks 🙏"],
      ["assistant", "See you then. If the fever crosses 103°F or you have trouble breathing before your visit, please go to the nearest emergency room."],
    ],
    "Rahul Menon": [
      ["user", "Good morning, can I get an appointment tomorrow morning?"],
      ["assistant", "Good morning Rahul. Tomorrow, Wednesday 9 September, Dr. Rao has 9:00 AM, 10:45 AM and 11:30 AM free. What would you like?"],
      ["user", "9 am please"],
      ["assistant", "Done — Wednesday 9 September, 9:00 AM. What should I put down as the reason?"],
      ["user", "Chest congestion, been a week"],
      ["assistant", "Noted. Confirmed for 9:00 AM tomorrow, chest congestion. See you then."],
    ],
    "Aisha Rahman": [
      ["user", "I want to move my Thursday appointment"],
      ["assistant", "Of course. I have you down for Thursday 10 September at 4:00 PM. Would Wednesday 9 September at 4:00 PM work instead?"],
      ["user", "Yes perfect"],
      ["assistant", "Moved to Wednesday 9 September, 4:00 PM. Your old slot is released."],
    ],
    "Vikram Shetty": [
      ["user", "hi"],
      ["assistant", "Hello! I'm the assistant for Sunrise Family Clinic. Would you like to book, reschedule or cancel a visit?"],
      ["user", "book. acidity problem, evening if possible"],
      ["assistant", "Tomorrow evening is fully booked; the closest is Wednesday 9 September at 12:30 PM. Shall I hold it?"],
      ["user", "ok"],
      ["assistant", "Booked — Wednesday 9 September, 12:30 PM, acidity and heartburn."],
    ],
    "Sunita Deshpande": [
      ["user", "Doctor ne bola tha thyroid report dikhane ke liye"],
      ["assistant", "Ji bilkul. Kal, budhwar 9 September, subah 9:30 baje ka slot khaali hai. Theek rahega?"],
      ["user", "haan theek hai"],
      ["assistant", "Book ho gaya — budhwar 9 September, 9:30 AM, thyroid report review ke liye. Report saath laaiyega."],
    ],
    "Fatima Sheikh": [
      ["user", "My son's second vaccination is due, when can we come?"],
      ["assistant", "Tomorrow at 11:00 AM or Thursday at 9:45 AM are both open. Which is easier?"],
      ["user", "Tomorrow 11"],
      ["assistant", "Booked — Wednesday 9 September, 11:00 AM, child vaccination. Please bring the immunisation card."],
    ],
    "Joseph Thomas": [
      ["user", "I need to speak to someone at the clinic about my insurance"],
      ["assistant", "I can't help with insurance or billing questions — I've passed this to the clinic team and someone will message you shortly."],
    ],
    "Arjun Iyer": [
      ["user", "I twisted my ankle playing football, it's swollen"],
      ["assistant", "That sounds painful. If you can't put any weight on it at all, please go to an emergency room. Otherwise Dr. Rao can see you tomorrow at 10:15 AM — shall I book that?"],
      ["user", "I can walk on it, book 10:15"],
      ["assistant", "Booked — Wednesday 9 September, 10:15 AM, sprained ankle. Ice it and keep it elevated until then."],
    ],
    "Imran Qureshi": [
      ["user", "I have severe chest pain and my left arm is numb"],
      ["assistant", "This may be a medical emergency. Please call 108 for an ambulance or go to the nearest emergency room right now. I've alerted the clinic team — do not wait for a reply here."],
    ],
  };

  for (const [name, msgs] of Object.entries(transcripts)) {
    let offset = msgs.length * 4;
    for (const [role, content] of msgs) {
      await db.conversation.create({
        data: {
          patientId: patients[name],
          role,
          content,
          createdAt: DateTime.now().minus({ days: 1, minutes: offset }).toJSDate(),
        },
      });
      offset -= 4;
    }
  }

  // Handoffs waiting on a human.
  await db.patient.update({
    where: { id: patients["Imran Qureshi"] },
    data: {
      needsHumanReview: true,
      needsHumanReviewReason: "Emergency red-flag symptom reported — chest pain with left-arm numbness. Emergency script sent; AI has stopped replying.",
      needsHumanReviewAt: DateTime.now().minus({ hours: 2, minutes: 12 }).toJSDate(),
    },
  });
  await db.patient.update({
    where: { id: patients["Joseph Thomas"] },
    data: {
      needsHumanReview: true,
      needsHumanReviewReason: "Patient asked about insurance coverage — outside what the assistant handles.",
      needsHumanReviewAt: DateTime.now().minus({ hours: 5, minutes: 40 }).toJSDate(),
    },
  });

  const counts = {
    patients: await db.patient.count({ where: { doctorId } }),
    appointments: await db.appointment.count({ where: { doctorId } }),
    events: await db.appointmentEvent.count({ where: { doctorId } }),
  };
  console.log("doctorId:", doctorId);
  console.log("detail appointment:", detailId);
  console.log(counts);
}

main().finally(() => db.$disconnect());
