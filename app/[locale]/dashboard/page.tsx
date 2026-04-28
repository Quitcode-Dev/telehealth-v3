"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {useRouter, useParams} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Button} from "@/src/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type Appointment = {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reasonForVisit: string | null;
  providerName: string | null;
  location: string | null;
  notes: string | null;
};

type LabResultCategory = "ROUTINE" | "SENSITIVE";

type LabResult = {
  id: string;
  testName: string;
  resultValue: string | null;
  status: string;
  category: LabResultCategory | null;
  releasedAt: string | null;
  observedAt: string | null;
  appointment: {providerName: string | null} | null;
};

type MessageThread = {
  id: string;
  unreadCount: number;
};

type ResultIndicator = "normal" | "abnormal" | "critical" | "unknown";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(isoString: string, locale: string) {
  try {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString(locale, {weekday: "short", year: "numeric", month: "short", day: "numeric"}),
      time: date.toLocaleTimeString(locale, {hour: "2-digit", minute: "2-digit"}),
    };
  } catch {
    return {date: isoString, time: ""};
  }
}

function formatDate(isoString: string | null, locale: string): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString(locale, {year: "numeric", month: "short", day: "numeric"});
  } catch {
    return isoString;
  }
}

function deriveIndicator(resultValue: string | null): ResultIndicator {
  if (!resultValue) return "unknown";
  const lower = resultValue.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("abnormal") || lower.includes("high") || lower.includes("low")) return "abnormal";
  return "normal";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ResultStatusBadge({resultValue}: {resultValue: string | null}) {
  const t = useTranslations("LabResultsPage");
  const indicator = deriveIndicator(resultValue);

  const styles: Record<ResultIndicator, string> = {
    normal: "bg-green-100 text-green-700",
    abnormal: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
    unknown: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[indicator]].join(" ")}>
      {t(`indicators.${indicator}`)}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");
  const router = useRouter();
  const {locale} = useParams<{locale: string}>();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      setIsLoading(true);
      setError(null);

      try {
        const [appointmentsRes, labResultsRes, messagesRes] = await Promise.all([
          fetch("/api/appointments?status=upcoming"),
          fetch("/api/lab-results?status=released&limit=3"),
          fetch("/api/messages"),
        ]);

        if (!cancelled) {
          if (appointmentsRes.status === 401 || labResultsRes.status === 401 || messagesRes.status === 401) {
            setError(t("errors.unauthorized"));
            return;
          }

          if (appointmentsRes.ok) {
            const data = (await appointmentsRes.json()) as {appointments: Appointment[]};
            setAppointments(data.appointments.slice(0, 3));
          }

          if (labResultsRes.ok) {
            const data = (await labResultsRes.json()) as {labResults: LabResult[]};
            setLabResults(data.labResults.slice(0, 3));
          }

          if (messagesRes.ok) {
            const data = (await messagesRes.json()) as {threads: MessageThread[]};
            const total = data.threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
            setUnreadCount(total);
          }
        }
      } catch {
        if (!cancelled) {
          setError(t("errors.loadFailed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const quickActions = [
    {label: t("actions.bookAppointment"), href: `/${locale}/appointments/book`},
    {label: t("actions.viewResults"), href: `/${locale}/results`},
    {label: t("actions.sendMessage"), href: `/${locale}/messages`},
    {label: t("actions.updateProfile"), href: `/${locale}/profile`},
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("sections.quickActions")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="cursor-pointer transition-colors hover:bg-secondary"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="flex items-center p-4">
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Two-column grid for appointments + lab results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <section aria-labelledby="appointments-heading">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle id="appointments-heading" className="text-base font-semibold">
                  {t("sections.upcomingAppointments")}
                </CardTitle>
                <Button
                  type="button"
                  className="h-7 px-2 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
                  onClick={() => router.push(`/${locale}/appointments`)}
                >
                  {t("actions.viewAll")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
                  <p className="text-sm text-muted-foreground">{t("empty.appointments")}</p>
                  <Button
                    type="button"
                    className="h-8 px-3 text-xs"
                    onClick={() => router.push(`/${locale}/appointments/book`)}
                  >
                    {t("actions.bookAppointment")}
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {appointments.map((appointment) => {
                    const {date, time} = formatDateTime(appointment.scheduledAt, locale);
                    return (
                      <li key={appointment.id} className="rounded-md border border-border p-3">
                        <p className="text-sm font-medium">{date}</p>
                        {time && <p className="text-xs text-muted-foreground">{time}</p>}
                        {appointment.providerName && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("labels.physician")}: <span className="font-medium text-foreground">{appointment.providerName}</span>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Latest lab results */}
        <section aria-labelledby="lab-results-heading">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle id="lab-results-heading" className="text-base font-semibold">
                  {t("sections.latestLabResults")}
                </CardTitle>
                <Button
                  type="button"
                  className="h-7 px-2 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
                  onClick={() => router.push(`/${locale}/results`)}
                >
                  {t("actions.viewAll")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : labResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty.labResults")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {labResults.map((result) => {
                    const displayDate = result.releasedAt ?? result.observedAt;
                    return (
                      <li key={result.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{result.testName}</p>
                          <ResultStatusBadge resultValue={result.resultValue} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(displayDate, locale)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Unread messages summary */}
      {!isLoading && unreadCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between rounded-md border border-border bg-card p-4"
        >
          <p className="text-sm">
            {t("unreadMessages", {count: unreadCount})}
          </p>
          <Button
            type="button"
            className="h-8 px-3 text-xs"
            onClick={() => router.push(`/${locale}/messages`)}
          >
            {t("actions.sendMessage")}
          </Button>
        </div>
      )}
    </div>
  );
}
