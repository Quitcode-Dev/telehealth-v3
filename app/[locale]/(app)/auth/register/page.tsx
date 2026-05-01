"use client";

import {useTranslations} from "next-intl";
import {useParams, useRouter} from "next/navigation";
import {useState} from "react";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Input} from "@/src/components/ui/input";

const UKRAINIAN_PHONE_PATTERN = /^\+380\d{9}$/;

type ApiErrorPayload = {error?: unknown};

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as ApiErrorPayload).error;
  return typeof error === "string" ? error : null;
}

export default function RegisterPage() {
  const t = useTranslations("RegisterPage");
  const params = useParams<{locale?: string}>();
  const router = useRouter();
  const currentLocale = params.locale === "uk" ? "uk" : "en";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(currentLocale);
  const [coverageType, setCoverageType] = useState<"nhsu" | "private">("nhsu");
  const [coverageId, setCoverageId] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const locale = currentLocale;
    const normalizedPhone = phoneNumber.trim();
    const normalizedEmail = email.trim();

    if (!fullName.trim()) {
      setErrorMessage(t("errors.fullNameRequired"));
      return;
    }

    if (!UKRAINIAN_PHONE_PATTERN.test(normalizedPhone)) {
      setErrorMessage(t("errors.phoneFormat"));
      return;
    }

    if (!dateOfBirth) {
      setErrorMessage(t("errors.dateOfBirthRequired"));
      return;
    }

    if (!coverageId.trim()) {
      setErrorMessage(t("errors.coverageIdRequired"));
      return;
    }

    if (!consentGiven) {
      setErrorMessage(t("errors.consentRequired"));
      return;
    }

    setIsSubmitting(true);

    const createResponse = await fetch("/api/patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        dateOfBirth,
        email: normalizedEmail || undefined,
        preferredLanguage,
        coverageType,
        coverageId: coverageId.trim(),
        consentGiven,
      }),
    });

    if (!createResponse.ok) {
      const payload = await createResponse.json().catch(() => null);
      const error = parseApiError(payload);
      if (error === "Phone number already registered") {
        setErrorMessage(t("errors.phoneExists"));
      } else if (error === "Email already registered") {
        setErrorMessage(t("errors.emailExists"));
      } else {
        setErrorMessage(t("errors.registrationFailed"));
      }
      setIsSubmitting(false);
      return;
    }

    const otpResponse = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({phoneNumber: normalizedPhone}),
    });

    if (!otpResponse.ok) {
      setErrorMessage(t("errors.otpFailed"));
      setIsSubmitting(false);
      return;
    }

    const callbackUrl = `/${locale}/dashboard`;
    const targetUrl = `/${locale}/auth/login?step=otp&phoneNumber=${encodeURIComponent(normalizedPhone)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    router.push(targetUrl);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col justify-center py-12">
      <Card>
        <CardHeader>
          <CardTitle as="h1">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium">
                {t("fullNameLabel")}
              </label>
              <Input id="full-name" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={isSubmitting} />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone-number" className="text-sm font-medium">
                {t("phoneLabel")}
              </label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder={t("phonePlaceholder")}
                autoComplete="tel"
                inputMode="tel"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="date-of-birth" className="text-sm font-medium">
                {t("dateOfBirthLabel")}
              </label>
              <Input
                id="date-of-birth"
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                required
                disabled={isSubmitting}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preferred-language" className="text-sm font-medium">
                {t("preferredLanguageLabel")}
              </label>
              <select
                id="preferred-language"
                value={preferredLanguage}
                onChange={(event) => setPreferredLanguage(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              >
                <option value="uk">{t("languageUk")}</option>
                <option value="en">{t("languageEn")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="coverage-type" className="text-sm font-medium">
                {t("coverageTypeLabel")}
              </label>
              <select
                id="coverage-type"
                value={coverageType}
                onChange={(event) => setCoverageType(event.target.value as "nhsu" | "private")}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              >
                <option value="nhsu">{t("coverageTypeNhsu")}</option>
                <option value="private">{t("coverageTypePrivate")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="coverage-id" className="text-sm font-medium">
                {t("coverageIdLabel")}
              </label>
              <Input id="coverage-id" type="text" value={coverageId} onChange={(event) => setCoverageId(event.target.value)} required disabled={isSubmitting} />
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 text-sm" htmlFor="consent-given">
                <input
                  id="consent-given"
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(event) => setConsentGiven(event.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border border-input"
                  required
                />
                <span>
                  {t("consentLabel")}{" "}
                  <a
                    href="https://zakon.rada.gov.ua/laws/show/2297-17#Text"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  >
                    {t("consentLinkText")}
                  </a>
                </span>
              </label>
            </div>

            {errorMessage ? (
              <p role="alert" className="text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
