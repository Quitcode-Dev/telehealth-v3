"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent} from "@/src/components/ui/card";

type LabResultCategory = "ROUTINE" | "SENSITIVE";

type LabResult = {
  id: string;
  testName: string;
  resultValue: string | null;
  contextNote: string | null;
  status: string;
  category: LabResultCategory | null;
  loincCode: string | null;
  sourceSystem: string | null;
  observedAt: string | null;
  releasedAt: string | null;
  appointment: {providerName: string | null} | null;
};

type ObservationFlag = "high" | "low" | "critical" | "normal" | "unknown";

function deriveFlag(resultValue: string | null): ObservationFlag {
  if (!resultValue) return "unknown";
  const lower = resultValue.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";
  if (lower.includes("abnormal")) return "high";
  return "normal";
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

function FlagBadge({flag, label}: {flag: ObservationFlag; label: string}) {
  const styles: Record<ObservationFlag, string> = {
    normal: "bg-green-100 text-green-700",
    high: "bg-red-100 text-red-700",
    low: "bg-red-100 text-red-700",
    critical: "bg-red-200 text-red-800",
    unknown: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[flag],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ObservationRow({
  name,
  value,
  flag,
  flagLabel,
}: {
  name: string;
  value: string | null;
  flag: ObservationFlag;
  flagLabel: string;
}) {
  const valueCellStyles: Record<ObservationFlag, string> = {
    normal: "text-green-700 font-medium",
    high: "text-red-700 font-medium",
    low: "text-red-700 font-medium",
    critical: "text-red-800 font-semibold",
    unknown: "text-foreground",
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 text-sm text-muted-foreground">{name}</td>
      <td className={["py-3 pr-4 text-sm", valueCellStyles[flag]].join(" ")}>
        {value ?? "—"}
      </td>
      <td className="py-3">
        <FlagBadge flag={flag} label={flagLabel} />
      </td>
    </tr>
  );
}

export default function LabResultDetailPage() {
  const t = useTranslations("LabResultDetailPage");
  const tList = useTranslations("LabResultsPage");
  const params = useParams<{id: string}>();
  const router = useRouter();

  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLabResult() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/lab-results/${params.id}`);

        if (!res.ok) {
          if (res.status === 401) {
            setError(tList("errors.unauthorized"));
          } else if (res.status === 404) {
            setError(t("errors.notFound"));
          } else if (res.status === 403) {
            setError(t("errors.forbidden"));
          } else {
            setError(tList("errors.loadFailed"));
          }
          return;
        }

        const data = (await res.json()) as {labResult: LabResult};

        if (!cancelled) {
          setLabResult(data.labResult);
        }
      } catch {
        if (!cancelled) {
          setError(tList("errors.loadFailed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchLabResult();

    return () => {
      cancelled = true;
    };
  }, [params.id, t, tList]);

  const flag = labResult ? deriveFlag(labResult.resultValue) : "unknown";
  const displayDate = labResult?.releasedAt ?? labResult?.observedAt ?? null;
  const physician =
    labResult?.appointment?.providerName ?? labResult?.sourceSystem ?? null;

  const flagLabel: Record<ObservationFlag, string> = {
    normal: tList("indicators.normal"),
    high: t("flags.high"),
    low: t("flags.low"),
    critical: tList("indicators.critical"),
    unknown: tList("indicators.unknown"),
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Back navigation */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("back")}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{tList("loading")}</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : labResult ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{labResult.testName}</h1>
              <p className="text-sm text-muted-foreground">
                {t("date")}: {formatDate(displayDate)}
              </p>
              {physician && (
                <p className="text-sm text-muted-foreground">
                  {tList("labels.physician")}:{" "}
                  <span className="font-medium text-foreground">{physician}</span>
                </p>
              )}
              {labResult.loincCode && (
                <p className="text-xs text-muted-foreground">
                  {t("loincCode")}: {labResult.loincCode}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {labResult.category && (
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    labResult.category === "SENSITIVE"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700",
                  ].join(" ")}
                >
                  {tList(
                    `category.${labResult.category.toLowerCase() as "routine" | "sensitive"}`,
                  )}
                </span>
              )}
              <Button
                type="button"
                aria-disabled="true"
                className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary opacity-50 cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                {t("downloadPdf")}
              </Button>
            </div>
          </div>

          {/* Physician context note */}
          {labResult.contextNote && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                  {tList("labels.physicianNote")}
                </p>
                <p className="text-sm text-blue-900">{labResult.contextNote}</p>
              </CardContent>
            </Card>
          )}

          {/* Observations table */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-3">{t("observations")}</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                      {t("columns.test")}
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                      {t("columns.value")}
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                      {t("columns.flag")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ObservationRow
                    name={labResult.testName}
                    value={labResult.resultValue}
                    flag={flag}
                    flagLabel={flagLabel[flag]}
                  />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
