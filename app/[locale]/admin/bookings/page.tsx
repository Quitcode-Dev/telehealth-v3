"use client";

import {useEffect, useState, useCallback, useRef} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Button} from "@/src/components/ui/button";
import {Input} from "@/src/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

type AppointmentStatus = "SCHEDULED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

type InsurancePolicy = {
  id: string;
  providerName: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
};

type Appointment = {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reasonForVisit: string | null;
  providerName: string | null;
  location: string | null;
  patient: {
    id: string;
    phoneNumber: string | null;
    user: {
      firstName: string;
      lastName: string;
    };
    insurancePolicies: InsurancePolicy[];
  };
};

type ApiResponse = {
  appointments: Appointment[];
  clinics: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function patientFullName(appt: Appointment): string {
  const {firstName, lastName} = appt.patient.user;
  return `${firstName} ${lastName}`.trim();
}

function isInsuranceActive(policy: InsurancePolicy): boolean {
  const now = Date.now();
  const effective = policy.effectiveDate ? new Date(policy.effectiveDate).getTime() : null;
  const expiration = policy.expirationDate ? new Date(policy.expirationDate).getTime() : null;

  if (effective !== null && effective > now) return false;
  // Treat the expiration date as valid through the end of that day
  if (expiration !== null) {
    const endOfExpirationDay = new Date(expiration);
    endOfExpirationDay.setHours(23, 59, 59, 999);
    if (endOfExpirationDay.getTime() < now) return false;
  }
  return true;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Booked",
  CHECKED_IN: "Checked In",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  NO_SHOW: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function StatusBadge({status}: {status: AppointmentStatus}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function InsuranceBadge({policies}: {policies: InsurancePolicy[]}) {
  if (policies.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        No insurance
      </span>
    );
  }
  const policy = policies[0];
  const active = isInsuranceActive(policy);
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      ].join(" ")}
      title={`${policy.providerName} · ${policy.policyNumber}`}
    >
      {active ? "Insured" : "Expired"}
    </span>
  );
}

// Actions available for each status
const STATUS_TRANSITIONS: Partial<Record<AppointmentStatus, {label: string; next: AppointmentStatus}[]>> = {
  SCHEDULED: [
    {label: "Check In", next: "CHECKED_IN"},
    {label: "Mark No Show", next: "NO_SHOW"},
  ],
  CHECKED_IN: [
    {label: "Complete", next: "COMPLETED"},
    {label: "Mark No Show", next: "NO_SHOW"},
  ],
  COMPLETED: [],
  NO_SHOW: [{label: "Reset to Booked", next: "SCHEDULED"}],
  CANCELLED: [],
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<string[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Ref to cancel in-flight fetches when filters change, preventing stale responses
  // from an older request from overwriting the state for the user's current input.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAppointments = useCallback(async () => {
    // Abort any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      // Build the explicit YYYY-MM-DD string from local date parts to avoid relying
      // on locale-dependent formatting that may vary across environments.
      const d = new Date();
      const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const params = new URLSearchParams({date: todayISO});
      if (selectedClinic) params.set("location", selectedClinic);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/appointments?${params.toString()}`, {
        signal: controller.signal,
      });

      // Bail out silently if this request was superseded.
      if (controller.signal.aborted) return;

      if (res.status === 401) {
        // Clear stale data so no patient information is shown while unauthorized.
        setAppointments([]);
        setClinics([]);
        setError("You are not authorized to view this page.");
        return;
      }

      if (!res.ok) {
        setAppointments([]);
        setClinics([]);
        setError("Unable to load appointments. Please try again.");
        return;
      }

      const data = (await res.json()) as ApiResponse;
      setAppointments(data.appointments);
      setClinics(data.clinics);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setAppointments([]);
      setClinics([]);
      setError("Unable to load appointments. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedClinic, debouncedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAppointments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAppointments]);

  async function handleStatusUpdate(appointmentId: string, newStatus: AppointmentStatus) {
    setUpdatingId(appointmentId);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status: newStatus}),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {error?: string};
        setUpdateError(data.error ?? "Failed to update status. Please try again.");
        return;
      }

      const updated = (await res.json()) as {id: string; status: AppointmentStatus};
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? {...a, status: updated.status} : a))
      );
    } catch {
      setUpdateError("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Booking Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="clinic-filter" className="text-sm font-medium text-foreground">
            Clinic
          </label>
          <select
            id="clinic-filter"
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All clinics</option>
            {clinics.map((clinic) => (
              <option key={clinic} value={clinic}>
                {clinic}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <label htmlFor="patient-search" className="sr-only">
            Search patient
          </label>
          <Input
            id="patient-search"
            type="search"
            placeholder="Search by patient name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Button
          type="button"
          className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
          onClick={() => void fetchAppointments()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Errors */}
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {updateError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {updateError}
        </p>
      )}

      {/* Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle as="h2" className="text-base font-semibold">
              Today&apos;s Appointments
              {!isLoading && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {appointments.length}
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading appointments…</p>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || selectedClinic
                  ? "No appointments match your filters."
                  : "No appointments scheduled for today."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {appointments.map((appt) => {
                const transitions = STATUS_TRANSITIONS[appt.status] ?? [];
                return (
                  <li
                    key={appt.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Patient info */}
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{patientFullName(appt)}</p>
                          <StatusBadge status={appt.status} />
                          <InsuranceBadge policies={appt.patient.insurancePolicies} />
                        </div>
                        {appt.patient.phoneNumber && (
                          <p className="text-xs text-muted-foreground">
                            Phone:{" "}
                            <span className="font-medium text-foreground">{appt.patient.phoneNumber}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Time:{" "}
                          <span className="font-medium text-foreground">{formatTime(appt.scheduledAt)}</span>
                          {appt.providerName && (
                            <>
                              {" · "}
                              <span className="font-medium text-foreground">{appt.providerName}</span>
                            </>
                          )}
                          {appt.location && (
                            <>
                              {" · "}
                              <span className="text-muted-foreground">{appt.location}</span>
                            </>
                          )}
                        </p>
                        {appt.reasonForVisit && (
                          <p className="text-xs text-muted-foreground">
                            Reason:{" "}
                            <span className="font-medium text-foreground">{appt.reasonForVisit}</span>
                          </p>
                        )}
                      </div>

                      {/* Status actions */}
                      {transitions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {transitions.map(({label, next}) => (
                            <Button
                              key={next}
                              type="button"
                              className={[
                                "h-8 px-3 text-xs",
                                next === "NO_SHOW"
                                  ? "bg-red-700 hover:opacity-90"
                                  : next === "COMPLETED"
                                    ? "bg-green-700 hover:opacity-90"
                                    : "border border-border bg-transparent text-foreground hover:bg-secondary",
                              ].join(" ")}
                              disabled={updatingId === appt.id}
                              onClick={() => void handleStatusUpdate(appt.id, next)}
                            >
                              {updatingId === appt.id ? "Updating…" : label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
