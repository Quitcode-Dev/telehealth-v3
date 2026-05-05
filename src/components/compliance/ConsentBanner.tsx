"use client";

import {useEffect, useState, useCallback} from "react";
import {useTranslations} from "next-intl";
import type {ConsentType} from "@/src/lib/compliance/consent";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsentBannerProps = {
  /** The consent type this banner is collecting. */
  consentType: ConsentType;
  /** The current version of the consent terms. */
  version: string;
  /** Called after consent is successfully recorded. */
  onAccepted?: () => void;
};

// ── ConsentBanner ─────────────────────────────────────────────────────────────

/**
 * Displays a consent banner when a patient has not yet granted consent for the
 * given type and version. On acceptance the consent is recorded via the API and
 * the banner is dismissed.
 *
 * Shown on first login and whenever the consent version changes.
 */
export function ConsentBanner({consentType, version, onAccepted}: ConsentBannerProps) {
  const t = useTranslations("ConsentBanner");

  const [visible, setVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConsent = useCallback(async () => {
    try {
      const res = await fetch(`/api/consent?type=${encodeURIComponent(consentType)}`);
      if (!res.ok) {
        // On API errors (including auth/503), show banner as safe default
        setVisible(true);
        return;
      }
      const data = (await res.json()) as {granted: boolean; version: string | null};
      // Show banner if consent has never been granted or version has changed
      if (!data.granted || data.version !== version) {
        setVisible(true);
      }
    } catch {
      // Network error: show banner as a safe default
      setVisible(true);
    }
  }, [consentType, version]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkConsent();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkConsent]);

  async function handleAccept() {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({consentType, version, granted: true}),
      });

      if (!res.ok) {
        setError(t("errors.saveFailed"));
        return;
      }

      setVisible(false);
      onAccepted?.();
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-description"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-2">
          <h2 id="consent-banner-title" className="text-base font-semibold">
            {t("title")}
          </h2>
          <p id="consent-banner-description" className="text-sm text-muted-foreground">
            {t("description")}{" "}
            <a
              href="https://zakon.rada.gov.ua/laws/show/2297-17#Text"
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              {t("legalLinkText")}
            </a>
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("version", {version})}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50"
            >
              {isSubmitting ? t("accepting") : t("accept")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
