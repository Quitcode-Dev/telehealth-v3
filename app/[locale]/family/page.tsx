"use client";

import {FormEvent, useMemo, useState} from "react";
import {useActiveProfile} from "@/src/components/family/ActiveProfileContext";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Input} from "@/src/components/ui/input";

type RelationshipType = "PARENT" | "GUARDIAN" | "CAREGIVER" | "LEGAL_REPRESENTATIVE";

const RELATIONSHIP_OPTIONS: Array<{value: RelationshipType; label: string}> = [
  {value: "PARENT", label: "Parent"},
  {value: "GUARDIAN", label: "Guardian"},
  {value: "CAREGIVER", label: "Caregiver"},
  {value: "LEGAL_REPRESENTATIVE", label: "Legal representative"},
];

function normalizeLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function statusBadgeClass(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-50 text-green-700";
  }

  if (status === "REJECTED") {
    return "border-red-300 bg-red-50 text-red-700";
  }

  return "border-amber-300 bg-amber-50 text-amber-700";
}

export default function FamilyDashboard() {
  const {relationships, refreshRelationships, isLoading} = useActiveProfile();
  const [patientId, setPatientId] = useState("");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("PARENT");
  const [document, setDocument] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedRelationships = useMemo(
    () => [...relationships].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [relationships],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!patientId.trim()) {
      setErrorMessage("Patient ID is required.");
      return;
    }

    if (!document) {
      setErrorMessage("Please attach a consent document.");
      return;
    }

    setIsSubmitting(true);

    const uploadBody = new FormData();
    uploadBody.append("document", document);

    const uploadResponse = await fetch("/api/proxy/upload", {
      method: "POST",
      body: uploadBody,
    });

    if (!uploadResponse.ok) {
      const uploadPayload = await uploadResponse.json().catch(() => null) as {error?: string} | null;
      setIsSubmitting(false);
      setErrorMessage(uploadPayload?.error ?? "Failed to upload consent document.");
      return;
    }

    const uploadPayload = await uploadResponse.json() as {consentDocumentUrl: string};

    const createResponse = await fetch("/api/proxy", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        patientId: patientId.trim(),
        relationshipType,
        consentDocumentUrl: uploadPayload.consentDocumentUrl,
      }),
    });

    setIsSubmitting(false);

    if (!createResponse.ok) {
      const createPayload = await createResponse.json().catch(() => null) as {error?: string} | null;
      setErrorMessage(createPayload?.error ?? "Failed to create proxy request.");
      return;
    }

    setPatientId("");
    setRelationshipType("PARENT");
    setDocument(null);
    setSuccessMessage("Proxy request submitted. Status is pending review.");
    await refreshRelationships();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Family dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Switch profiles from the header and manage proxy requests for family members.
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Linked family members</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading linked profiles...</p> : null}
          {!isLoading && sortedRelationships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked family profiles yet.</p>
          ) : null}
          {sortedRelationships.map((relationship) => {
            const firstName = relationship.patient?.user?.firstName ?? "Family";
            const lastName = relationship.patient?.user?.lastName ?? "Member";

            return (
              <article key={relationship.id} className="rounded-md border border-border p-3">
                <h2 className="font-medium">{`${firstName} ${lastName}`}</h2>
                <p className="text-sm text-muted-foreground">Relationship: {normalizeLabel(relationship.relationshipType)}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(relationship.status)}`}>
                  {normalizeLabel(relationship.status)}
                </span>
              </article>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request new proxy access</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:max-w-xl" onSubmit={(event) => void onSubmit(event)}>
            <Input
              placeholder="Family member patient ID (UUID)"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              required
            />
            <label className="grid gap-1 text-sm">
              Relationship
              <select
                value={relationshipType}
                onChange={(event) => setRelationshipType(event.target.value as RelationshipType)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Consent document (birth certificate or power of attorney)
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
                className="rounded-md border border-input px-3 py-2 text-sm"
                required
              />
            </label>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit proxy request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
