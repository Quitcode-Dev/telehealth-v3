"use client";

import {useEffect, useState, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Button} from "@/src/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

type ProxyStatus = "PENDING" | "APPROVED" | "REJECTED";

type ProxyRequest = {
  id: string;
  proxyUserId: string;
  patientId: string;
  relationshipType: string;
  consentDocumentUrl: string | null;
  status: ProxyStatus;
  reviewedAt: string | null;
  isActive: boolean;
  createdAt: string;
  proxyUser: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  patient: {
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const SLA_HOURS = 24;

function isSlaBreached(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created > SLA_HOURS * 60 * 60 * 1000;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatRelationshipType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function requesterName(req: ProxyRequest): string {
  if (req.proxyUser) {
    return `${req.proxyUser.firstName} ${req.proxyUser.lastName}`.trim() || req.proxyUser.email;
  }
  return req.proxyUserId;
}

function patientName(req: ProxyRequest): string {
  if (req.patient?.user) {
    return `${req.patient.user.firstName} ${req.patient.user.lastName}`.trim();
  }
  return req.patientId;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SlaIndicator({createdAt}: {createdAt: string}) {
  const breached = isSlaBreached(createdAt);
  if (!breached) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      ⚠ SLA breached
    </span>
  );
}

function StatusBadge({status}: {status: ProxyStatus}) {
  const styles: Record<ProxyStatus, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status]].join(" ")}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProxyApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<ProxyRequest[]>([]);
  const [auditTrail, setAuditTrail] = useState<ProxyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pendingRes, reviewedRes] = await Promise.all([
        fetch("/api/proxy?status=pending"),
        fetch("/api/proxy?status=approved&limit=10"),
      ]);

      if (pendingRes.status === 401 || reviewedRes.status === 401) {
        setError("You are not authorized to view this page.");
        return;
      }

      if (!pendingRes.ok || !reviewedRes.ok) {
        setError("Unable to load proxy requests. Please try again.");
        return;
      }

      const pending = (await pendingRes.json()) as ProxyRequest[];
      const approved = (await reviewedRes.json()) as ProxyRequest[];

      // Also fetch rejected for audit trail (server-side limited)
      const rejectedRes = await fetch("/api/proxy?status=rejected&limit=10");
      const rejected = rejectedRes.ok ? ((await rejectedRes.json()) as ProxyRequest[]) : [];

      setPendingRequests(pending);
      const reviewed = [...approved, ...rejected].sort(
        (a, b) => new Date(b.reviewedAt ?? b.createdAt).getTime() - new Date(a.reviewedAt ?? a.createdAt).getTime(),
      );
      setAuditTrail(reviewed);
    } catch {
      setError("Unable to load proxy requests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRequests();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRequests]);

  async function handleAction(id: string, status: "APPROVED" | "REJECTED") {
    setActioningId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/proxy/${id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status}),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {error?: string};
        setActionError(data.error ?? "Failed to update request. Please try again.");
        return;
      }

      await fetchRequests();
    } catch {
      setActionError("Failed to update request. Please try again.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Proxy Approval Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve or reject pending proxy access requests. Requests must be actioned within {SLA_HOURS} hours.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {actionError && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Document preview modal */}
      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-lg bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Consent document</p>
              <Button
                type="button"
                className="h-7 px-2 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
                onClick={() => setPreviewUrl(null)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={previewUrl}
                title="Consent document"
                className="h-[70vh] w-full min-w-[50vw] rounded border border-border"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pending queue */}
      <section aria-labelledby="pending-heading">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle as="h2" id="pending-heading" className="text-base font-semibold">
                Pending Requests
                {!isLoading && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {pendingRequests.length}
                  </span>
                )}
              </CardTitle>
              <Button
                type="button"
                className="h-7 px-2 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
                onClick={() => void fetchRequests()}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading requests…</p>
            ) : pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">No pending proxy requests.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4" role="list">
                {pendingRequests.map((req) => (
                  <li key={req.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{requesterName(req)}</p>
                          <StatusBadge status={req.status} />
                          <SlaIndicator createdAt={req.createdAt} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requesting proxy access for:{" "}
                          <span className="font-medium text-foreground">{patientName(req)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Relationship:{" "}
                          <span className="font-medium text-foreground">{formatRelationshipType(req.relationshipType)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: <span className="font-medium text-foreground">{formatDate(req.createdAt)}</span>
                        </p>
                        {req.proxyUser?.email && (
                          <p className="text-xs text-muted-foreground">
                            Email: <span className="font-medium text-foreground">{req.proxyUser.email}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {req.consentDocumentUrl && (
                          <Button
                            type="button"
                            className="h-8 px-3 text-xs border border-border bg-transparent text-foreground hover:bg-secondary"
                            onClick={() => setPreviewUrl(req.consentDocumentUrl)}
                          >
                            View document
                          </Button>
                        )}
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs bg-green-700 hover:opacity-90"
                          disabled={actioningId === req.id}
                          onClick={() => void handleAction(req.id, "APPROVED")}
                        >
                          {actioningId === req.id ? "Processing…" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs bg-red-700 hover:opacity-90"
                          disabled={actioningId === req.id}
                          onClick={() => void handleAction(req.id, "REJECTED")}
                        >
                          {actioningId === req.id ? "Processing…" : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Audit trail */}
      <section aria-labelledby="audit-heading">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle as="h2" id="audit-heading" className="text-base font-semibold">
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : auditTrail.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviewed requests yet.</p>
            ) : (
              <ul className="flex flex-col gap-3" role="list">
                {auditTrail.map((req) => (
                  <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{requesterName(req)}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Patient: <span className="font-medium text-foreground">{patientName(req)}</span>
                        {" · "}
                        {formatRelationshipType(req.relationshipType)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reviewed: <span className="font-medium text-foreground">{req.reviewedAt ? formatDate(req.reviewedAt) : "—"}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
