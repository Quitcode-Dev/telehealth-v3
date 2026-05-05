import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {ConsentType} from "@prisma/client";
import {authOptions} from "@/src/lib/auth";
import {getConsentService} from "@/src/lib/compliance/consent";
import prisma from "@/src/lib/prisma";

const CONSENT_TYPES = Object.values(ConsentType) as [ConsentType, ...ConsentType[]];

const recordConsentSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  version: z.string().trim().min(1).max(50),
  granted: z.boolean(),
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

function patientNotFound() {
  return NextResponse.json({error: "Patient profile not found"}, {status: 404});
}

type PatientLookupResult =
  | {status: "ok"; patientId: string}
  | {status: "unauthorized"}
  | {status: "not_found"};

async function resolvePatient(): Promise<PatientLookupResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (typeof userId !== "string") return {status: "unauthorized"};

  if (!process.env.DATABASE_URL) return {status: "not_found"};

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!patient) return {status: "not_found"};
  return {status: "ok", patientId: patient.id};
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Consent service unavailable"}, {status: 503});
  }

  const lookup = await resolvePatient();
  if (lookup.status === "unauthorized") return unauthorized();
  if (lookup.status === "not_found") return patientNotFound();

  const {searchParams} = new URL(request.url);
  const consentType = searchParams.get("type");
  const parsed = z.enum(CONSENT_TYPES).safeParse(consentType);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid consent type"}, {status: 400});
  }

  const status = await getConsentService().checkConsent(lookup.patientId, parsed.data);

  return NextResponse.json({
    granted: status.granted,
    version: status.version,
    recordedAt: status.recordedAt?.toISOString() ?? null,
  });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Consent service unavailable"}, {status: 503});
  }

  const lookup = await resolvePatient();
  if (lookup.status === "unauthorized") return unauthorized();
  if (lookup.status === "not_found") return patientNotFound();

  const body = await request.json().catch(() => null);
  const parsed = recordConsentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid consent payload"}, {status: 400});
  }

  await getConsentService().recordConsent(
    lookup.patientId,
    parsed.data.consentType,
    parsed.data.version,
    parsed.data.granted,
  );

  return NextResponse.json({success: true}, {status: 201});
}
