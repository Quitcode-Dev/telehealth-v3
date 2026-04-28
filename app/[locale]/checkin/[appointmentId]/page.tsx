"use client";

import {useTranslations} from "next-intl";
import {useParams, useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Input} from "@/src/components/ui/input";

type ProfileResponse = {
  patientId: string;
  demographics: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string | null;
    gender: string | null;
    phoneNumber: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  insurance: {
    providerName: string;
    policyNumber: string;
    groupNumber: string;
  };
  medicalSummary: {
    allergies: string;
    currentMedications: string;
  };
};

type FormData = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProviderName: string;
  insurancePolicyNumber: string;
  insuranceGroupNumber: string;
  allergies: string;
  currentMedications: string;
  consentConfirmed: boolean;
};

const TOTAL_STEPS = 4;

function StepIndicator({currentStep, totalSteps, labels}: {currentStep: number; totalSteps: number; labels: string[]}) {
  return (
    <nav aria-label="Check-in steps" className="mb-6">
      <ol className="flex items-center gap-1">
        {Array.from({length: totalSteps}, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <li key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isCompleted
                      ? "bg-green-600 text-white"
                      : isCurrent
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground",
                  ].join(" ")}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? "✓" : step}
                </div>
                <span className={["text-xs text-center", isCurrent ? "font-medium" : "text-muted-foreground"].join(" ")}>
                  {labels[i]}
                </span>
              </div>
              {step < totalSteps && (
                <div className={["h-px flex-1 mx-1 mb-5", isCompleted ? "bg-green-600" : "bg-border"].join(" ")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function CheckInPage() {
  const t = useTranslations("CheckInPage");
  const params = useParams<{appointmentId: string}>();
  const router = useRouter();
  const appointmentId = params.appointmentId;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    insuranceProviderName: "",
    insurancePolicyNumber: "",
    insuranceGroupNumber: "",
    allergies: "",
    currentMedications: "",
    consentConfirmed: false,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/patients/me");
        if (!res.ok) {
          setErrorMessage(t("errors.loadFailed"));
          setIsLoading(false);
          return;
        }
        const profile = (await res.json()) as ProfileResponse;
        setFormData((prev) => ({
          ...prev,
          firstName: profile.demographics.firstName ?? "",
          lastName: profile.demographics.lastName ?? "",
          phoneNumber: profile.demographics.phoneNumber ?? "",
          emergencyContactName: profile.demographics.emergencyContactName ?? "",
          emergencyContactPhone: profile.demographics.emergencyContactPhone ?? "",
          insuranceProviderName: profile.insurance.providerName ?? "",
          insurancePolicyNumber: profile.insurance.policyNumber ?? "",
          insuranceGroupNumber: profile.insurance.groupNumber ?? "",
          allergies: profile.medicalSummary.allergies ?? "",
          currentMedications: profile.medicalSummary.currentMedications ?? "",
        }));
      } catch {
        setErrorMessage(t("errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [t]);

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({...prev, [field]: value}));
  }

  async function handleSubmit() {
    if (!formData.consentConfirmed) {
      setErrorMessage(t("errors.consentRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/checkin/${appointmentId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          demographics: {
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            phoneNumber: formData.phoneNumber || undefined,
            emergencyContactName: formData.emergencyContactName || undefined,
            emergencyContactPhone: formData.emergencyContactPhone || undefined,
          },
          insurance: {
            providerName: formData.insuranceProviderName || undefined,
            policyNumber: formData.insurancePolicyNumber || undefined,
            groupNumber: formData.insuranceGroupNumber || undefined,
          },
          allergies: formData.allergies || undefined,
          medications: formData.currentMedications || undefined,
          consentConfirmed: formData.consentConfirmed,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {error?: string} | null;
        setErrorMessage(body?.error ?? t("errors.submitFailed"));
        return;
      }

      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepLabels = [
    t("steps.demographics"),
    t("steps.insurance"),
    t("steps.medical"),
    t("steps.consent"),
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  if (isSuccess) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h1 className="text-xl font-semibold">{t("success.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("success.description")}</p>
            <Button type="button" onClick={() => router.push("/appointments")}>
              {t("success.viewAppointments")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={stepLabels} />

      {errorMessage && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {/* Step 1: Demographics */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.demographics")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("stepHints.demographics")}</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="firstName">{t("fields.firstName")}</label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder={t("fields.firstName")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="lastName">{t("fields.lastName")}</label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder={t("fields.lastName")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="phoneNumber">{t("fields.phoneNumber")}</label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="+380XXXXXXXXX"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="emergencyContactName">{t("fields.emergencyContactName")}</label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => updateField("emergencyContactName", e.target.value)}
                placeholder={t("fields.emergencyContactName")}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="emergencyContactPhone">{t("fields.emergencyContactPhone")}</label>
              <Input
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                placeholder="+380XXXXXXXXX"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Insurance */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.insurance")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("stepHints.insurance")}</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="insuranceProviderName">{t("fields.insuranceProviderName")}</label>
              <Input
                id="insuranceProviderName"
                value={formData.insuranceProviderName}
                onChange={(e) => updateField("insuranceProviderName", e.target.value)}
                placeholder={t("fields.insuranceProviderName")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="insurancePolicyNumber">{t("fields.insurancePolicyNumber")}</label>
              <Input
                id="insurancePolicyNumber"
                value={formData.insurancePolicyNumber}
                onChange={(e) => updateField("insurancePolicyNumber", e.target.value)}
                placeholder={t("fields.insurancePolicyNumber")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="insuranceGroupNumber">{t("fields.insuranceGroupNumber")}</label>
              <Input
                id="insuranceGroupNumber"
                value={formData.insuranceGroupNumber}
                onChange={(e) => updateField("insuranceGroupNumber", e.target.value)}
                placeholder={t("fields.insuranceGroupNumber")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Allergies & Medications */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.medical")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("stepHints.medical")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="allergies">{t("fields.allergies")}</label>
              <textarea
                id="allergies"
                rows={4}
                value={formData.allergies}
                onChange={(e) => updateField("allergies", e.target.value)}
                placeholder={t("fields.allergiesPlaceholder")}
                className="min-h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="currentMedications">{t("fields.currentMedications")}</label>
              <textarea
                id="currentMedications"
                rows={4}
                value={formData.currentMedications}
                onChange={(e) => updateField("currentMedications", e.target.value)}
                placeholder={t("fields.currentMedicationsPlaceholder")}
                className="min-h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Consent & Submit */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.consent")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("stepHints.consent")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
              <p>{t("consentText.intro")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("consentText.point1")}</li>
                <li>{t("consentText.point2")}</li>
                <li>{t("consentText.point3")}</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border border-border"
                checked={formData.consentConfirmed}
                onChange={(e) => {
                  updateField("consentConfirmed", e.target.checked);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              <span className="text-sm font-medium">{t("consentLabel")}</span>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="border border-border bg-transparent text-foreground"
          onClick={() => {
            setErrorMessage(null);
            if (step > 1) {
              setStep((s) => s - 1);
            } else {
              router.back();
            }
          }}
        >
          {t("back")}
        </Button>

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setStep((s) => s + 1);
            }}
          >
            {t("next")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !formData.consentConfirmed}
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
