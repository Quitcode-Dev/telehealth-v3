"use client";

import {useTranslations} from "next-intl";
import {useSearchParams, useRouter} from "next/navigation";
import {useEffect, useState, Suspense} from "react";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import type {InsuranceVerificationResult} from "@/app/api/insurance/verify/route";
import {PaymentForm} from "@/src/components/payments/PaymentForm";

const REASON_MAX_LENGTH = 500;

function formatTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
  } catch {
    return isoString;
  }
}

function formatDate(isoString: string) {
  try {
    return new Date(isoString).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} ₴`;
}

type ConfirmState =
  | {phase: "loading"}
  | {phase: "ready"; insurance: InsuranceVerificationResult; patientId: string}
  | {phase: "payment"; insurance: InsuranceVerificationResult; patientId: string}
  | {phase: "success"; appointmentId: string}
  | {phase: "error"; message: string};

function AppointmentConfirmContent() {
  const t = useTranslations("AppointmentConfirmPage");
  const searchParams = useSearchParams();
  const router = useRouter();

  const slotId = searchParams.get("slotId") ?? "";
  const physicianName = searchParams.get("physicianName") ?? "";
  const specialty = searchParams.get("specialty") ?? "";
  const startsAt = searchParams.get("startsAt") ?? "";
  const endsAt = searchParams.get("endsAt") ?? "";
  const location = searchParams.get("location") ?? "";

  const [state, setState] = useState<ConfirmState>({phase: "loading"});
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfirmData() {
      const fallbackInsurance: InsuranceVerificationResult = {
        status: "pending",
        insuranceProvider: null,
        policyNumber: null,
        totalPrice: 500,
        coverageAmount: 0,
        coPay: 500,
      };

      // Fetch insurance and patient profile in parallel.
      const [insuranceRes, profileRes] = await Promise.allSettled([
        fetch("/api/insurance/verify"),
        fetch("/api/patients/me"),
      ]);

      if (cancelled) return;

      let insurance = fallbackInsurance;
      if (insuranceRes.status === "fulfilled" && insuranceRes.value.ok) {
        insurance = (await insuranceRes.value.json()) as InsuranceVerificationResult;
      }

      let patientId = "";
      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        const profile = (await profileRes.value.json()) as {patientId?: string};
        patientId = profile.patientId ?? "";
      }

      if (!cancelled) {
        setState({phase: "ready", insurance, patientId});
      }
    }

    void loadConfirmData();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleConfirm() {
    if (state.phase !== "ready") return;

    const trimmed = reasonForVisit.trim();
    if (!trimmed) {
      setReasonError(t("errors.reasonRequired"));
      return;
    }
    if (trimmed.length > REASON_MAX_LENGTH) {
      setReasonError(t("errors.reasonTooLong", {max: REASON_MAX_LENGTH}));
      return;
    }
    setReasonError(null);

    setState({phase: "payment", insurance: state.insurance, patientId: state.patientId});
  }

  if (state.phase === "success") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h1 className="text-xl font-semibold">{t("success.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("success.description")}</p>
            <p className="text-xs text-muted-foreground">
              {t("success.reference")}: <span className="font-mono">{state.appointmentId}</span>
            </p>
            <Button type="button" onClick={() => router.push("/appointments")}>
              {t("success.viewAppointments")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const insurance = state.phase === "ready" || state.phase === "payment" ? state.insurance : null;
  const isPaymentPhase = state.phase === "payment";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Appointment summary */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("fields.specialty")}</dt>
              <dd className="font-medium">{specialty || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("fields.physician")}</dt>
              <dd className="font-medium">{physicianName || t("fields.anyAvailable")}</dd>
            </div>
            {startsAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("fields.date")}</dt>
                <dd className="font-medium">{formatDate(startsAt)}</dd>
              </div>
            )}
            {startsAt && endsAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("fields.time")}</dt>
                <dd className="font-medium">
                  {formatTime(startsAt)}–{formatTime(endsAt)}
                </dd>
              </div>
            )}
            {location && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("fields.location")}</dt>
                <dd className="font-medium">{location}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Insurance & cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("costTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {state.phase === "loading" ? (
            <p className="text-sm text-muted-foreground">{t("verifyingInsurance")}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("fields.insuranceStatus")}:</span>
                {insurance?.status === "covered" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    ✓ {t("insuranceStatus.covered")}
                  </span>
                )}
                {insurance?.status === "not_covered" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    ✗ {t("insuranceStatus.notCovered")}
                  </span>
                )}
                {insurance?.status === "pending" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    ⏳ {t("insuranceStatus.pending")}
                  </span>
                )}
              </div>

              {insurance?.status === "covered" && insurance.insuranceProvider && (
                <p className="text-xs text-muted-foreground">
                  {t("fields.insuredWith")}: <span className="font-medium">{insurance.insuranceProvider}</span>
                  {insurance.policyNumber ? ` · ${insurance.policyNumber}` : ""}
                </p>
              )}

              {insurance?.status === "not_covered" && (
                <p className="text-xs text-amber-700">
                  {t("insuranceStatus.notCoveredNote")}
                </p>
              )}

              {insurance?.status === "pending" && (
                <p className="text-xs text-amber-700">
                  {t("insuranceStatus.pendingNote")}
                </p>
              )}

              {insurance && (
                <dl className="space-y-1.5 rounded-md border border-border p-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("cost.totalPrice")}</dt>
                    <dd>{formatCurrency(insurance.totalPrice)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("cost.coverageAmount")}</dt>
                    <dd className="text-green-600">−{formatCurrency(insurance.coverageAmount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                    <dt>{t("cost.coPay")}</dt>
                    <dd>{formatCurrency(insurance.coPay)}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason for visit — hidden once the user proceeds to payment */}
      {!isPaymentPhase && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("reasonTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reason-for-visit">
              {t("reasonLabel")}
            </label>
            <textarea
              id="reason-for-visit"
              rows={4}
              maxLength={REASON_MAX_LENGTH}
              value={reasonForVisit}
              onChange={(e) => {
                setReasonForVisit(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder={t("reasonPlaceholder")}
              className="w-full resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-describedby={reasonError ? "reason-error" : "reason-counter"}
            />
            <div className="flex items-center justify-between">
              {reasonError ? (
                <p id="reason-error" role="alert" className="text-xs text-red-600">
                  {reasonError}
                </p>
              ) : (
                <span />
              )}
              <p
                id="reason-counter"
                className={["text-xs", reasonForVisit.length > REASON_MAX_LENGTH * 0.9 ? "text-amber-600" : "text-muted-foreground"].join(" ")}
              >
                {reasonForVisit.length}/{REASON_MAX_LENGTH}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment widget — shown after the user clicks "Proceed to payment" */}
      {state.phase === "payment" && (
        <PaymentForm
          patientId={state.patientId}
          slotId={slotId}
          amount={state.insurance.coPay}
          description={`Telehealth consultation: ${specialty || "appointment"}`}
          reasonForVisit={reasonForVisit.trim()}
          onSuccess={(appointmentId) => setState({phase: "success", appointmentId})}
          onCancel={() => setState({phase: "ready", insurance: state.insurance, patientId: state.patientId})}
        />
      )}

      {/* Error from submission */}
      {state.phase === "error" && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Actions — hidden while the payment widget is active */}
      {!isPaymentPhase && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="border border-border bg-transparent text-foreground"
            onClick={() => router.back()}
          >
            {t("back")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={state.phase === "loading"}
          >
            {t("proceedToPayment")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AppointmentConfirmPage() {
  return (
    <Suspense>
      <AppointmentConfirmContent />
    </Suspense>
  );
}
