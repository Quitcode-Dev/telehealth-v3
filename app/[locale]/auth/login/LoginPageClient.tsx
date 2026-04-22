"use client";

import {signIn} from "next-auth/react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {type KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Input} from "@/src/components/ui/input";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const UKRAINIAN_PHONE_PATTERN = /^\+380\d{9}$/;

type LoginStep = "phone" | "otp";

type LoginPageClientProps = {
  callbackUrl: string;
};

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as {error?: unknown}).error;
  return typeof error === "string" ? error : null;
}

export function LoginPageClient({callbackUrl}: LoginPageClientProps) {
  const t = useTranslations("LoginPage");
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({length: OTP_LENGTH}, () => ""));
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpCode = useMemo(() => otpDigits.join(""), [otpDigits]);

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step !== "otp") {
      return;
    }

    otpInputRefs.current[0]?.focus();
  }, [step]);

  async function sendOtpCode(targetPhoneNumber: string) {
    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({phoneNumber: targetPhoneNumber}),
    });

    if (response.ok) {
      return {ok: true};
    }

    const data = await response.json().catch(() => null);
    return {ok: false, error: parseApiError(data)};
  }

  async function handlePhoneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedPhone = phoneNumber.trim();

    if (!UKRAINIAN_PHONE_PATTERN.test(normalizedPhone)) {
      setErrorMessage(t("errors.phoneFormat"));
      return;
    }

    setIsSubmitting(true);
    const sendResult = await sendOtpCode(normalizedPhone);
    setIsSubmitting(false);

    if (!sendResult.ok) {
      setErrorMessage(sendResult.error === "Too many OTP requests. Please try again later." ? t("errors.tooManyRequests") : t("errors.sendOtpFailed"));
      return;
    }

    setPhoneNumber(normalizedPhone);
    setOtpDigits(Array.from({length: OTP_LENGTH}, () => ""));
    setCountdown(RESEND_COOLDOWN_SECONDS);
    setStep("otp");
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) {
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!/^\d{6}$/.test(otpCode)) {
      setErrorMessage(t("errors.otpFormat"));
      return;
    }

    setIsSubmitting(true);
    const verifyResponse = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({phoneNumber, otpCode}),
    });

    if (!verifyResponse.ok) {
      const payload = await verifyResponse.json().catch(() => null);
      const apiError = parseApiError(payload);
      setErrorMessage(
        apiError === "Incorrect OTP code" || apiError === "OTP has expired" ? t("errors.otpIncorrect") : t("errors.verifyOtpFailed"),
      );
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      phoneNumber,
      otpCode,
      callbackUrl,
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      setErrorMessage(t("errors.signInFailed"));
      setIsSubmitting(false);
      return;
    }

    router.push(signInResult.url ?? callbackUrl);
    router.refresh();
  }

  async function handleResendOtp() {
    if (countdown > 0 || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    const sendResult = await sendOtpCode(phoneNumber);
    setIsSubmitting(false);

    if (!sendResult.ok) {
      setErrorMessage(sendResult.error === "Too many OTP requests. Please try again later." ? t("errors.tooManyRequests") : t("errors.sendOtpFailed"));
      return;
    }

    setOtpDigits(Array.from({length: OTP_LENGTH}, () => ""));
    setCountdown(RESEND_COOLDOWN_SECONDS);
    otpInputRefs.current[0]?.focus();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{step === "phone" ? t("phoneStepDescription") : t("otpStepDescription", {phoneNumber})}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form className="space-y-4" onSubmit={handlePhoneSubmit}>
              <div className="space-y-2">
                <label htmlFor="phone-number" className="text-sm font-medium">
                  {t("phoneLabel")}
                </label>
                <Input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={t("phonePlaceholder")}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errorMessage ? (
                <p role="alert" className="text-sm text-red-600">
                  {errorMessage}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("sendingOtp") : t("sendOtp")}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleOtpSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("otpLabel")}</label>
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      type="text"
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete={index === 0 ? "one-time-code" : undefined}
                      className="h-12 w-12 p-0 text-center text-lg"
                      disabled={isSubmitting}
                      aria-label={t("otpDigitLabel", {index: index + 1})}
                      required
                    />
                  ))}
                </div>
              </div>
              {errorMessage ? (
                <p role="alert" className="text-sm text-red-600">
                  {errorMessage}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("verifyingOtp") : t("verifyOtp")}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">{countdown > 0 ? t("resendCountdown", {seconds: countdown}) : t("resendReady")}</p>
                <Button
                  type="button"
                  className="h-auto bg-transparent px-0 text-foreground hover:bg-transparent hover:underline"
                  disabled={countdown > 0 || isSubmitting}
                  onClick={handleResendOtp}
                >
                  {t("resendOtp")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
