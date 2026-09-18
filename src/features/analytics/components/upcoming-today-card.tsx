import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/features/appointments";
import type { UpcomingBookingSummary } from "../services/analytics-service";
import type { TemplateContent } from "@/features/templates/types";

type UpcomingTodayCardProps = {
  total: number;
  next: UpcomingBookingSummary[];
  labels: TemplateContent["labels"];
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** The "what's left today" card — the count on its own answers "how busy am I today", the
 *  short list underneath answers "what's next" without a full trip to the bookings list. */
export async function UpcomingTodayCard({ total, next, labels }: UpcomingTodayCardProps) {
  const t = await getTranslations("Analytics.upcomingToday");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <p className="text-sm">{t("title", { bookings: labels.bookingPlural })}</p>
        </div>
        <Link href="/dashboard/appointments" className="text-sm text-primary hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <p className="font-heading text-2xl text-foreground">{total}</p>

      {next.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {next.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/appointments/${booking.id}`}
              className="flex items-center justify-between gap-3 text-sm hover:underline"
            >
              <span className="text-foreground">
                {formatTime(booking.startAt)} ·{" "}
                {booking.customerName ?? t("unnamedCustomer", { customer: labels.customerSingular.toLowerCase() })}
              </span>
              <StatusBadge status={booking.status} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
