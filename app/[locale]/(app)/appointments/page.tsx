"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";

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

type Tab = "upcoming" | "past" | "cancelled";

function formatDateTime(isoString: string) {
  try {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString([], {weekday: "short", year: "numeric", month: "short", day: "numeric"}),
      time: date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}),
    };
  } catch {
    return {date: isoString, time: ""};
  }
}

function StatusBadge({status}: {status: AppointmentStatus}) {
  const t = useTranslations("AppointmentsPage");

  const styles: Record<AppointmentStatus, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status]].join(" ")}>
      {t(`status.${status.toLowerCase() as "scheduled" | "completed" | "cancelled" | "no_show"}`)}
    </span>
  );
}

function AppointmentCard({
  appointment,
  showActions,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  showActions: boolean;
  onCancel: (id: string) => void;
  onReschedule: (appointment: Appointment) => void;
}) {
  const t = useTranslations("AppointmentsPage");
  const {date, time} = formatDateTime(appointment.scheduledAt);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{date}</span>
              {time && <span className="text-sm text-muted-foreground">· {time}</span>}
              <StatusBadge status={appointment.status} />
            </div>
            {appointment.providerName && (
              <p className="text-sm text-muted-foreground">
                {t("labels.physician")}: <span className="font-medium text-foreground">{appointment.providerName}</span>
              </p>
            )}
            {appointment.location && (
              <p className="text-sm text-muted-foreground">
                {t("labels.location")}: <span className="font-medium text-foreground">{appointment.location}</span>
              </p>
            )}
            {appointment.reasonForVisit && (
              <p className="text-sm text-muted-foreground">
                {t("labels.reason")}: <span className="font-medium text-foreground">{appointment.reasonForVisit}</span>
              </p>
            )}
          </div>

          {showActions && (
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
              <Button
                type="button"
                className="border border-border bg-transparent text-foreground text-xs h-8 px-3"
                onClick={() => onReschedule(appointment)}
              >
                {t("actions.reschedule")}
              </Button>
              <Button
                type="button"
                className="border border-red-300 bg-transparent text-red-600 text-xs h-8 px-3 hover:bg-red-50"
                onClick={() => onCancel(appointment.id)}
              >
                {t("actions.cancel")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CancelDialog({
  onConfirm,
  onClose,
  isCancelling,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isCancelling: boolean;
}) {
  const t = useTranslations("AppointmentsPage");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 id="cancel-dialog-title" className="text-lg font-semibold">
          {t("cancelDialog.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("cancelDialog.message")}</p>
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
          {t("cancelDialog.policy")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            className="border border-border bg-transparent text-foreground"
            onClick={onClose}
            disabled={isCancelling}
          >
            {t("cancelDialog.back")}
          </Button>
          <Button
            type="button"
            className="border border-red-300 bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? t("cancelDialog.cancelling") : t("cancelDialog.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const t = useTranslations("AppointmentsPage");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAppointments() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/appointments?status=${activeTab}`);

        if (!res.ok) {
          if (res.status === 401) {
            setError(t("errors.unauthorized"));
          } else {
            setError(t("errors.loadFailed"));
          }
          return;
        }

        const data = (await res.json()) as {appointments: Appointment[]};

        if (!cancelled) {
          setAppointments(data.appointments);
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

    void fetchAppointments();

    return () => {
      cancelled = true;
    };
  }, [activeTab, t]);

  function handleCancelRequest(id: string) {
    setCancelTargetId(id);
    setCancelError(null);
  }

  async function handleConfirmCancel() {
    if (!cancelTargetId) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/appointments/${cancelTargetId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status: "CANCELLED"}),
      });

      if (!res.ok) {
        setCancelError(t("errors.cancelFailed"));
        return;
      }

      setAppointments((prev) => prev.filter((a) => a.id !== cancelTargetId));
      setCancelTargetId(null);
    } catch {
      setCancelError(t("errors.cancelFailed"));
    } finally {
      setIsCancelling(false);
    }
  }

  function handleReschedule(appointment: Appointment) {
    const params = new URLSearchParams();
    if (appointment.providerName) {
      params.set("physicianName", appointment.providerName);
    }
    router.push(`/appointments/book?${params.toString()}`);
  }

  const tabs: {id: Tab; label: string}[] = [
    {id: "upcoming", label: t("tabs.upcoming")},
    {id: "past", label: t("tabs.past")},
    {id: "cancelled", label: t("tabs.cancelled")},
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border" role="tablist" aria-label={t("title")}>
        {tabs.map(({id, label}) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tabpanel-${id}`}
            id={`tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
              activeTab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : error ? (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">{t(`empty.${activeTab}`)}</p>
            {activeTab === "upcoming" && (
              <Button type="button" onClick={() => router.push("/appointments/book")}>
                {t("actions.bookNew")}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                showActions={activeTab === "upcoming"}
                onCancel={handleCancelRequest}
                onReschedule={handleReschedule}
              />
            ))}
          </div>
        )}
      </div>

      {cancelError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cancelError}
        </p>
      )}

      {cancelTargetId && (
        <CancelDialog
          onConfirm={() => void handleConfirmCancel()}
          onClose={() => setCancelTargetId(null)}
          isCancelling={isCancelling}
        />
      )}
    </div>
  );
}
