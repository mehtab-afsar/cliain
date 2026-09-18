import { AlertTriangle, CalendarRange, Clock, TrendingUp, UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { resolveTemplateByVersion } from "@/features/templates/registry";
import { getAnalyticsSummary } from "./services/analytics-service";
import { StatTile } from "./components/stat-tile";
import { UpcomingTodayCard } from "./components/upcoming-today-card";

function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * The dashboard's landing page — a clinic-facing (or gym-facing — every noun below comes from
 * `template.labels`) overview of how the AI is doing this week: booking volume, no-shows,
 * what's left today, and the two rougher proxies (response time, conversion) called out as
 * approximations in their own doc comments in analytics-service.ts.
 *
 * A Server Component, not a client hook+API-route pair like AppointmentsView/PatientsView —
 * there's no per-viewer mutation here (nothing to clear/edit), so there's no reason to pay for
 * a client round trip just to render numbers computed once per page load.
 */
export async function AnalyticsView({ tenantId, templateVersion }: { tenantId: string; templateVersion: string }) {
  const { labels } = resolveTemplateByVersion(templateVersion);
  const summary = await getAnalyticsSummary(tenantId);
  const t = await getTranslations("Analytics.overview");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", {
          business: labels.businessNoun.toLowerCase(),
          bookings: labels.bookingPlural.toLowerCase(),
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={CalendarRange}
          label={t("bookingsThisWeekLabel", { bookings: labels.bookingPlural })}
          value={String(summary.bookingsThisWeek.total)}
          hint={t("bookingsThisMonthHint", { count: summary.bookingsThisMonth.total })}
        />
        <StatTile
          icon={UserX}
          label={t("noShowRateLabel")}
          value={formatPercent(summary.noShowRate)}
          hint={t("last30Days")}
        />
        <StatTile
          icon={Clock}
          label={t("medianResponseLabel")}
          value={formatDuration(summary.medianResponseTimeSeconds)}
          hint={t("medianResponseHint", { customer: labels.customerSingular.toLowerCase() })}
        />
        <StatTile
          icon={TrendingUp}
          label={t("conversionLabel", { customer: labels.customerSingular, booking: labels.bookingSingular.toLowerCase() })}
          value={formatPercent(summary.bookingConversionRate)}
          hint={t("last30DaysApprox")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingTodayCard total={summary.upcomingToday.total} next={summary.upcomingToday.next} labels={labels} />

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">{t("needsAttention")}</p>
          </div>
          <p className="font-heading text-2xl text-foreground">{summary.needsAttentionCount}</p>
          <p className="text-xs text-muted-foreground">
            {summary.needsAttentionCount > 0
              ? t("needsAttentionHint", { customers: labels.customerPlural })
              : t("needsAttentionEmpty")}
          </p>
        </div>
      </div>
    </div>
  );
}
