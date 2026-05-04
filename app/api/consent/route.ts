import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import {getConsentService} from "@/src/lib/compliance/consent";
import prisma from "@/src/lib/prisma";

const CONSENT_TYPES = ["data_processing", "lab_result_access", "communication_preferences", "proxy_access"] as const;

const recordConsentSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  version: z.string().trim().min(1).max(50),
  granted: z.boolean(),
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getPatientId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (typeof userId !== "string") return null;

  if (!process.env.DATABASE_URL) return null;

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  return patient?.id ?? null;
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Consent service unavailable"}, {status: 503});
  }

  const patientId = await getPatientId();
  if (!patientId) {
    return unauthorized();
  }

  const {searchParams} = new URL(request.url);
  const consentType = searchParams.get("type");
  const parsed = z.enum(CONSENT_TYPES).safeParse(consentType);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid consent type"}, {status: 400});
  }

  const status = await getConsentService().checkConsent(patientId, parsed.data);

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

  const patientId = await getPatientId();
  if (!patientId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = recordConsentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid consent payload"}, {status: 400});
  }

  await getConsentService().recordConsent(
    patientId,
    parsed.data.consentType,
    parsed.data.version,
    parsed.data.granted,
  );

  return NextResponse.json({success: true}, {status: 201});
}
