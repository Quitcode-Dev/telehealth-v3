import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/src/lib/prisma";
import {categorizeByLoincCode} from "@/src/lib/lab/categories";

const fhirCodingSchema = z.object({
  system: z.string().optional(),
  code: z.string().min(1),
  display: z.string().optional(),
});

const fhirReferenceSchema = z.object({
  reference: z.string().optional(),
  display: z.string().optional(),
});

const fhirDiagnosticReportSchema = z.object({
  resourceType: z.literal("DiagnosticReport"),
  id: z.string().optional(),
  status: z.enum([
    "registered",
    "partial",
    "preliminary",
    "final",
    "amended",
    "corrected",
    "appended",
    "cancelled",
    "entered-in-error",
    "unknown",
  ]),
  code: z.object({
    coding: z.array(fhirCodingSchema).min(1),
    text: z.string().optional(),
  }),
  subject: z.object({
    reference: z.string().min(1),
  }),
  effectiveDateTime: z.string().optional(),
  issued: z.string().optional(),
  performer: z.array(fhirReferenceSchema).optional(),
  conclusion: z.string().optional(),
});

/**
 * Extract a UUID from a FHIR reference string of the form "ResourceType/{uuid}".
 */
function extractIdFromReference(reference: string): string | null {
  const parts = reference.split("/");
  const id = parts[parts.length - 1];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id ?? "") ? (id ?? null) : null;
}

/**
 * POST /api/lab-results/ingest
 *
 * Accepts a FHIR DiagnosticReport resource from Dila/Synevo (via Helsi),
 * categorises the result as ROUTINE or SENSITIVE based on LOINC code
 * mappings, and persists it to the LabResult table with the appropriate
 * review status.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Lab result ingestion is unavailable"}, {status: 503});
  }

  const body = await request.json().catch(() => null);
  const parsed = fhirDiagnosticReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {error: "Invalid FHIR DiagnosticReport payload", details: parsed.error.flatten()},
      {status: 400},
    );
  }

  const report = parsed.data;

  const patientId = extractIdFromReference(report.subject.reference);
  if (!patientId) {
    return NextResponse.json(
      {error: "Invalid subject reference: expected Patient/{uuid}"},
      {status: 400},
    );
  }

  const patient = await prisma.patient.findUnique({
    where: {id: patientId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient not found"}, {status: 404});
  }

  // Resolve LOINC code from the first coding entry with the LOINC system,
  // falling back to the first coding entry available.
  const loincCoding =
    report.code.coding.find((c) => c.system === "http://loinc.org") ??
    report.code.coding[0];

  const loincCode = loincCoding?.code ?? "";
  const testName = loincCoding?.display ?? report.code.text ?? loincCode;
  const category = categorizeByLoincCode(loincCode);
  const status = category === "SENSITIVE" ? "PENDING_REVIEW" : "AUTO_RELEASE";

  // Derive the source system from the first performer entry if available.
  const sourceSystem =
    report.performer?.[0]?.display ??
    report.performer?.[0]?.reference?.split("/").pop() ??
    null;

  const observedAt = report.effectiveDateTime ? new Date(report.effectiveDateTime) : null;

  try {
    const labResult = await prisma.labResult.create({
      data: {
        patientId: patient.id,
        testName,
        status,
        category,
        loincCode: loincCode || null,
        fhirId: report.id ?? null,
        sourceSystem,
        observedAt,
        resultValue: report.conclusion ?? null,
      },
      select: {
        id: true,
        patientId: true,
        testName: true,
        status: true,
        category: true,
        loincCode: true,
        fhirId: true,
        sourceSystem: true,
        observedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({labResult}, {status: 201});
  } catch (error) {
    console.error("Failed to ingest lab result", error);
    return NextResponse.json({error: "Failed to store lab result"}, {status: 500});
  }
}
