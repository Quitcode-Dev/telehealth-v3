"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
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
  sourceSystem: string | null;
  observedAt: string | null;
  releasedAt: string | null;
  appointment: {providerName: string | null} | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ResultIndicator = "normal" | "abnormal" | "critical" | "unknown";

function deriveIndicator(resultValue: string | null): ResultIndicator {
  if (!resultValue) return "unknown";
  const lower = resultValue.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("abnormal") || lower.includes("high") || lower.includes("low")) return "abnormal";
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

function StatusBadge({resultValue}: {resultValue: string | null}) {
  const t = useTranslations("LabResultsPage");
  const indicator = deriveIndicator(resultValue);

  const styles: Record<ResultIndicator, string> = {
    normal: "bg-green-100 text-green-700",
    abnormal: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
    unknown: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[indicator],
      ].join(" ")}
    >
      {t(`indicators.${indicator}`)}
    </span>
  );
}

function CategoryBadge({category}: {category: LabResultCategory | null}) {
  const t = useTranslations("LabResultsPage");
  if (!category) return null;

  const styles: Record<LabResultCategory, string> = {
    ROUTINE: "bg-blue-100 text-blue-700",
    SENSITIVE: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[category],
      ].join(" ")}
    >
      {t(`category.${category.toLowerCase() as "routine" | "sensitive"}`)}
    </span>
  );
}

function LabResultCard({result, locale}: {result: LabResult; locale: string}) {
  const t = useTranslations("LabResultsPage");
  const displayDate = result.releasedAt ?? result.observedAt;
  const physician = result.appointment?.providerName ?? result.sourceSystem;

  return (
    <Link href={`/${locale}/results/${result.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded-lg hover:opacity-90 transition-opacity">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{result.testName}</h2>
                <p className="text-xs text-muted-foreground">{formatDate(displayDate)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge resultValue={result.resultValue} />
                <CategoryBadge category={result.category} />
              </div>
            </div>

            {physician && (
              <p className="text-sm text-muted-foreground">
                {t("labels.physician")}:{" "}
                <span className="font-medium text-foreground">{physician}</span>
              </p>
            )}

            {result.resultValue && (
              <p className="text-sm text-muted-foreground">
                {t("labels.result")}:{" "}
                <span className="font-medium text-foreground">{result.resultValue}</span>
              </p>
            )}

            {result.contextNote && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t("labels.physicianNote")}
                </p>
                <p className="text-sm text-foreground">{result.contextNote}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LabResultsPage() {
  const t = useTranslations("LabResultsPage");
  const {locale} = useParams<{locale: string}>();

  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState<"" | "ROUTINE" | "SENSITIVE">("");

  useEffect(() => {
    let cancelled = false;

    async function fetchLabResults() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          patientId: "me",
          status: "released",
          page: String(page),
        });
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (category) params.set("category", category);

        const res = await fetch(`/api/lab-results?${params.toString()}`);

        if (!res.ok) {
          if (res.status === 401) {
            setError(t("errors.unauthorized"));
          } else {
            setError(t("errors.loadFailed"));
          }
          return;
        }

        const data = (await res.json()) as {
          labResults: LabResult[];
          pagination: Pagination;
        };

        if (!cancelled) {
          setLabResults(data.labResults);
          setPagination(data.pagination);
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

    void fetchLabResults();

    return () => {
      cancelled = true;
    };
  }, [page, dateFrom, dateTo, category, t]);

  function handleApplyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
  }

  function handleClearFilters() {
    setDateFrom("");
    setDateTo("");
    setCategory("");
    setPage(1);
  }

  const hasActiveFilters = dateFrom !== "" || dateTo !== "" || category !== "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleApplyFilters}
        className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
        aria-label={t("filters.label")}
      >
        <p className="text-sm font-medium">{t("filters.label")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="dateFrom">
              {t("filters.dateFrom")}
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="dateTo">
              {t("filters.dateTo")}
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="category">
              {t("filters.category")}
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as "" | "ROUTINE" | "SENSITIVE")}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <option value="">{t("filters.categoryAll")}</option>
              <option value="ROUTINE">{t("category.routine")}</option>
              <option value="SENSITIVE">{t("category.sensitive")}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-8 px-3 text-xs">
            {t("filters.apply")}
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
              onClick={handleClearFilters}
            >
              {t("filters.clear")}
            </Button>
          )}
        </div>
      </form>

      {/* Results list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : labResults.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {labResults.map((result) => (
            <LabResultCard key={result.id} result={result} locale={locale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.pageOf", {page, totalPages: pagination.totalPages})}
          </span>
          <Button
            type="button"
            className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
